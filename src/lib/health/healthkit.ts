import type {
  QuantityTypeIdentifier,
  QueryStatisticsResponse,
  StatisticsOptions,
} from "@kingstinct/react-native-healthkit";

import {
  type DailyRollup,
  type HealthMetric,
  type HealthProvider,
  localDay,
  METRIC_INFO,
  startOfDayAgo,
} from "./types";

// Lazy require: importing the native module at the top level would crash
// Expo Go. The provider is only constructed inside a dev build.
type HK = typeof import("@kingstinct/react-native-healthkit");
const hk = (): HK => require("@kingstinct/react-native-healthkit") as HK;

interface QuantityPlan {
  identifier: QuantityTypeIdentifier;
  statistics: readonly StatisticsOptions[];
  unit: string;
  pick: (bucket: QueryStatisticsResponse) => number | undefined;
}

const QUANTITY_PLANS: Record<Exclude<HealthMetric, "sleep_minutes">, QuantityPlan> = {
  heart_rate: {
    identifier: "HKQuantityTypeIdentifierHeartRate",
    statistics: ["discreteAverage", "discreteMin", "discreteMax"],
    unit: "count/min",
    pick: (b) => b.averageQuantity?.quantity,
  },
  steps: {
    identifier: "HKQuantityTypeIdentifierStepCount",
    statistics: ["cumulativeSum"],
    unit: "count",
    pick: (b) => b.sumQuantity?.quantity,
  },
  spo2: {
    identifier: "HKQuantityTypeIdentifierOxygenSaturation",
    statistics: ["discreteAverage", "discreteMin", "discreteMax"],
    unit: "%",
    pick: (b) => b.averageQuantity?.quantity,
  },
  hrv: {
    identifier: "HKQuantityTypeIdentifierHeartRateVariabilitySDNN",
    statistics: ["discreteAverage", "discreteMin", "discreteMax"],
    unit: "ms",
    pick: (b) => b.averageQuantity?.quantity,
  },
  active_energy: {
    identifier: "HKQuantityTypeIdentifierActiveEnergyBurned",
    statistics: ["cumulativeSum"],
    unit: "kcal",
    pick: (b) => b.sumQuantity?.quantity,
  },
};

/** HKCategoryValueSleepAnalysis values that count as actually asleep. */
const ASLEEP_VALUES = new Set([1, 3, 4, 5]);

async function readQuantityRollups(
  metric: Exclude<HealthMetric, "sleep_minutes">,
  days: number,
): Promise<DailyRollup[]> {
  const plan = QUANTITY_PLANS[metric];
  const startDate = startOfDayAgo(days - 1);
  const buckets = await hk().queryStatisticsCollectionForQuantity(
    plan.identifier,
    plan.statistics,
    startDate,
    { day: 1 },
    { filter: { date: { startDate, endDate: new Date() } }, unit: plan.unit },
  );

  const rollups: DailyRollup[] = [];
  for (const bucket of buckets) {
    const value = plan.pick(bucket);
    if (value === undefined || bucket.startDate === undefined) continue;
    rollups.push({
      metric,
      day: localDay(bucket.startDate),
      value,
      minValue: bucket.minimumQuantity?.quantity ?? null,
      maxValue: bucket.maximumQuantity?.quantity ?? null,
      sampleCount: 0,
      unit: METRIC_INFO[metric].unit,
    });
  }
  return rollups;
}

async function readSleepRollups(days: number): Promise<DailyRollup[]> {
  const startDate = startOfDayAgo(days - 1);
  const samples = await hk().queryCategorySamples("HKCategoryTypeIdentifierSleepAnalysis", {
    filter: { date: { startDate, endDate: new Date() } },
    ascending: true,
    limit: 5000,
  });

  // A night's sleep is attributed to the day it ends (the wake-up day).
  const minutesByDay = new Map<string, { minutes: number; sessions: number }>();
  for (const sample of samples) {
    if (!ASLEEP_VALUES.has(sample.value as number)) continue;
    const minutes = (sample.endDate.getTime() - sample.startDate.getTime()) / 60000;
    if (minutes <= 0) continue;
    const day = localDay(sample.endDate);
    const entry = minutesByDay.get(day) ?? { minutes: 0, sessions: 0 };
    entry.minutes += minutes;
    entry.sessions += 1;
    minutesByDay.set(day, entry);
  }

  return [...minutesByDay.entries()].map(([day, entry]) => ({
    metric: "sleep_minutes" as const,
    day,
    value: Math.round(entry.minutes),
    minValue: null,
    maxValue: null,
    sampleCount: entry.sessions,
    unit: METRIC_INFO.sleep_minutes.unit,
  }));
}

export function createHealthKitProvider(): HealthProvider {
  return {
    source: "healthkit",
    isAvailable: () => hk().isHealthDataAvailableAsync(),
    requestPermissions: (metrics: HealthMetric[]) => {
      const toRead = metrics.map((metric) =>
        metric === "sleep_minutes"
          ? ("HKCategoryTypeIdentifierSleepAnalysis" as const)
          : QUANTITY_PLANS[metric].identifier,
      );
      return hk().requestAuthorization({ toRead });
    },
    readDailyRollups: async (metrics: HealthMetric[], days: number) => {
      const rollups: DailyRollup[] = [];
      for (const metric of metrics) {
        try {
          rollups.push(
            ...(metric === "sleep_minutes"
              ? await readSleepRollups(days)
              : await readQuantityRollups(metric, days)),
          );
        } catch {
          // One denied/unavailable metric must not sink the whole sync.
        }
      }
      return rollups;
    },
  };
}
