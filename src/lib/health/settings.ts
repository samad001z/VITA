import AsyncStorage from "@react-native-async-storage/async-storage";

import { ALL_METRICS, type HealthMetric } from "./types";

const ENABLED_KEY = "vita.health.enabledMetrics";
const LAST_SYNC_KEY = "vita.health.lastSyncAt";

/** Metrics the user has switched on. Empty array = not connected. */
export async function getEnabledMetrics(): Promise<HealthMetric[]> {
  try {
    const raw = await AsyncStorage.getItem(ENABLED_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return ALL_METRICS.filter((m) => parsed.includes(m));
  } catch {
    return [];
  }
}

export async function setEnabledMetrics(metrics: HealthMetric[]): Promise<void> {
  await AsyncStorage.setItem(ENABLED_KEY, JSON.stringify(metrics));
}

export async function getLastSyncAt(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_SYNC_KEY);
}

export async function setLastSyncAt(iso: string): Promise<void> {
  await AsyncStorage.setItem(LAST_SYNC_KEY, iso);
}
