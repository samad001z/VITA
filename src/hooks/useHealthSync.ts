import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { getEnabledMetrics, getLastSyncAt } from "@/lib/health/settings";
import { syncHealthData } from "@/lib/health/sync";
import { type HealthMetric } from "@/lib/health/types";
import { useAuth } from "@/providers/AuthProvider";

const FOREGROUND_SYNC_COOLDOWN_MS = 5 * 60 * 1000;

interface UseHealthSyncResult {
  enabledMetrics: HealthMetric[];
  lastSyncAt: string | null;
  syncing: boolean;
  /** Re-read settings and run a sync now (after the user changes toggles). */
  refresh: () => Promise<void>;
}

/**
 * Foreground half of the sync strategy: syncs when the app becomes active
 * (rate-limited to once per 5 minutes) and exposes connection state for UI.
 */
export function useHealthSync(): UseHealthSyncResult {
  const { session } = useAuth();
  const [enabledMetrics, setEnabledMetricsState] = useState<HealthMetric[]>([]);
  const [lastSyncAt, setLastSyncAtState] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const lastRunRef = useRef(0);

  const refresh = useCallback(async (): Promise<void> => {
    const metrics = await getEnabledMetrics();
    setEnabledMetricsState(metrics);
    if (session === null || metrics.length === 0) {
      setLastSyncAtState(await getLastSyncAt());
      return;
    }
    setSyncing(true);
    try {
      await syncHealthData();
      lastRunRef.current = Date.now();
    } catch {
      // Sync is best-effort; the next foreground/background pass retries.
    } finally {
      setSyncing(false);
      setLastSyncAtState(await getLastSyncAt());
    }
  }, [session]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      if (Date.now() - lastRunRef.current < FOREGROUND_SYNC_COOLDOWN_MS) return;
      void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  return { enabledMetrics, lastSyncAt, syncing, refresh };
}
