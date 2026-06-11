import { type HealthMetric } from "@/lib/database.types";

export type { HealthMetric };

export interface DailyRollup {
  metric: HealthMetric;
  /** Local calendar day, YYYY-MM-DD. */
  day: string;
  value: number;
  minValue: number | null;
  maxValue: number | null;
  sampleCount: number;
  unit: string;
}

/** Unified surface over HealthKit (iOS) and Health Connect (Android). */
export interface HealthProvider {
  source: "healthkit" | "health_connect";
  isAvailable: () => Promise<boolean>;
  requestPermissions: (metrics: HealthMetric[]) => Promise<boolean>;
  /** Read per-day rollups for the trailing `days` window (today inclusive). */
  readDailyRollups: (metrics: HealthMetric[], days: number) => Promise<DailyRollup[]>;
}

export const ALL_METRICS: HealthMetric[] = [
  "heart_rate",
  "sleep_minutes",
  "steps",
  "spo2",
  "hrv",
  "active_energy",
];

/** Permission-sheet copy: what we read and, crucially, why. */
export const METRIC_INFO: Record<HealthMetric, { label: string; why: string; unit: string }> = {
  heart_rate: {
    label: "Heart rate",
    why: "Learns your normal resting rhythm so drifts stand out.",
    unit: "bpm",
  },
  sleep_minutes: {
    label: "Sleep",
    why: "Tracks how much rest you actually get, night by night.",
    unit: "min",
  },
  steps: {
    label: "Steps",
    why: "A simple signal of how active your days are.",
    unit: "steps",
  },
  spo2: {
    label: "Blood oxygen",
    why: "Watches for sustained dips below your usual level.",
    unit: "%",
  },
  hrv: {
    label: "Heart rate variability",
    why: "A gentle indicator of recovery and strain.",
    unit: "ms",
  },
  active_energy: {
    label: "Active energy",
    why: "How much you move, in calories burned.",
    unit: "kcal",
  },
};

/** YYYY-MM-DD in the device's local calendar. */
export function localDay(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Start of the local day `daysAgo` days before today. */
export function startOfDayAgo(daysAgo: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}
