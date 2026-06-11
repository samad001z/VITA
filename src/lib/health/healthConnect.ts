import type { Permission, RecordType } from "react-native-health-connect";

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
type HC = typeof import("react-native-health-connect");
const hc = (): HC => require("react-native-health-connect") as HC;

const RECORD_BY_METRIC: Record<HealthMetric, RecordType> = {
  heart_rate: "HeartRate",
  sleep_minutes: "SleepSession",
  steps: "Steps",
  spo2: "OxygenSaturation",
  hrv: "HeartRateVariabilityRmssd",
  active_energy: "ActiveCaloriesBurned",
};

interface DayAccumulator {
  sum: number;
  count: number;
  min: number;
  max: number;
}

function accumulate(map: Map<string, DayAccumulator>, day: string, value: number): void {
  const entry = map.get(day) ?? { sum: 0, count: 0, min: value, max: value };
  entry.sum += value;
  entry.count += 1;
  entry.min = Math.min(entry.min, value);
  entry.max = Math.max(entry.max, value);
  map.set(day, entry);
}

function toRollups(
  metric: HealthMetric,
  map: Map<string, DayAccumulator>,
  mode: "average" | "sum",
): DailyRollup[] {
  return [...map.entries()].map(([day, acc]) => ({
    metric,
    day,
    value: mode === "average" ? acc.sum / acc.count : acc.sum,
    minValue: mode === "average" ? acc.min : null,
    maxValue: mode === "average" ? acc.max : null,
    sampleCount: acc.count,
    unit: METRIC_INFO[metric].unit,
  }));
}

async function readMetric(metric: HealthMetric, days: number): Promise<DailyRollup[]> {
  const timeRangeFilter = {
    operator: "between" as const,
    startTime: startOfDayAgo(days - 1).toISOString(),
    endTime: new Date().toISOString(),
  };
  const byDay = new Map<string, DayAccumulator>();

  switch (metric) {
    case "heart_rate": {
      const { records } = await hc().readRecords("HeartRate", { timeRangeFilter });
      for (const record of records) {
        for (const sample of record.samples) {
          accumulate(byDay, localDay(new Date(sample.time)), sample.beatsPerMinute);
        }
      }
      return toRollups(metric, byDay, "average");
    }
    case "sleep_minutes": {
      const { records } = await hc().readRecords("SleepSession", { timeRangeFilter });
      for (const record of records) {
        const minutes =
          (new Date(record.endTime).getTime() - new Date(record.startTime).getTime()) / 60000;
        if (minutes <= 0) continue;
        // A night's sleep is attributed to the day it ends (the wake-up day).
        accumulate(byDay, localDay(new Date(record.endTime)), minutes);
      }
      return toRollups(metric, byDay, "sum").map((r) => ({
        ...r,
        value: Math.round(r.value),
      }));
    }
    case "steps": {
      const { records } = await hc().readRecords("Steps", { timeRangeFilter });
      for (const record of records) {
        accumulate(byDay, localDay(new Date(record.startTime)), record.count);
      }
      return toRollups(metric, byDay, "sum");
    }
    case "spo2": {
      const { records } = await hc().readRecords("OxygenSaturation", { timeRangeFilter });
      for (const record of records) {
        accumulate(byDay, localDay(new Date(record.time)), record.percentage);
      }
      return toRollups(metric, byDay, "average");
    }
    case "hrv": {
      const { records } = await hc().readRecords("HeartRateVariabilityRmssd", {
        timeRangeFilter,
      });
      for (const record of records) {
        accumulate(byDay, localDay(new Date(record.time)), record.heartRateVariabilityMillis);
      }
      return toRollups(metric, byDay, "average");
    }
    case "active_energy": {
      const { records } = await hc().readRecords("ActiveCaloriesBurned", { timeRangeFilter });
      for (const record of records) {
        accumulate(byDay, localDay(new Date(record.startTime)), record.energy.inKilocalories);
      }
      return toRollups(metric, byDay, "sum");
    }
  }
}

export function createHealthConnectProvider(): HealthProvider {
  return {
    source: "health_connect",
    isAvailable: async () => {
      const status = await hc().getSdkStatus();
      return status === hc().SdkAvailabilityStatus.SDK_AVAILABLE;
    },
    requestPermissions: async (metrics: HealthMetric[]) => {
      const initialized = await hc().initialize();
      if (!initialized) return false;
      const wanted: Permission[] = metrics.map((metric) => ({
        accessType: "read",
        recordType: RECORD_BY_METRIC[metric],
      }));
      const granted = await hc().requestPermission(wanted);
      return granted.length > 0;
    },
    readDailyRollups: async (metrics: HealthMetric[], days: number) => {
      await hc().initialize();
      const rollups: DailyRollup[] = [];
      for (const metric of metrics) {
        try {
          rollups.push(...(await readMetric(metric, days)));
        } catch {
          // One denied/unavailable metric must not sink the whole sync.
        }
      }
      return rollups;
    },
  };
}
