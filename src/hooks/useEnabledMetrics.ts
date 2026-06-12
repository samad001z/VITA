import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { getEnabledMetrics } from "@/lib/health/settings";
import { type HealthMetric } from "@/lib/health/types";

/**
 * Metrics the user shares, re-read on every focus so Home reflects changes
 * made in the Health sheet the moment the user comes back.
 */
export function useEnabledMetrics(): HealthMetric[] {
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void getEnabledMetrics().then((enabled) => {
        if (alive) setMetrics(enabled);
      });
      return () => {
        alive = false;
      };
    }, []),
  );

  return metrics;
}
