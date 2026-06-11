import { useCallback, useEffect, useState } from "react";

import { type MetricDailyRollupRow } from "@/lib/database.types";
import { type HealthMetric, localDay, METRIC_INFO, startOfDayAgo } from "@/lib/health/types";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

const WINDOW_DAYS = 30;
const SERIES_POINTS = 14;
const RECENT_DAYS = 7;

export interface MetricInsight {
  metric: HealthMetric;
  label: string;
  unit: string;
  latest: number;
  /** Oldest → newest values for the sparkline. */
  series: number[];
  /** "+6% vs your normal" — null until a baseline exists. */
  delta: string | null;
  deltaTone: "soft" | "sage" | "gold";
}

interface UseInsightsResult {
  insights: MetricInsight[] | null;
  refresh: () => Promise<void>;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const a = sorted[mid];
  const b = sorted[sorted.length % 2 === 0 ? mid - 1 : mid];
  return ((a ?? 0) + (b ?? 0)) / 2;
}

function buildInsight(metric: HealthMetric, rows: MetricDailyRollupRow[]): MetricInsight | null {
  if (rows.length === 0) return null;
  const latestRow = rows[rows.length - 1];
  if (latestRow === undefined) return null;

  const recentCutoff = localDay(startOfDayAgo(RECENT_DAYS - 1));
  const baselineValues = rows.filter((r) => r.day < recentCutoff).map((r) => r.value);

  let delta: string | null = null;
  let deltaTone: MetricInsight["deltaTone"] = "soft";
  if (baselineValues.length >= 7) {
    const base = median(baselineValues);
    if (base > 0) {
      const pct = Math.round(((latestRow.value - base) / base) * 100);
      if (Math.abs(pct) < 5) {
        delta = "≈ your normal";
        deltaTone = "sage";
      } else {
        delta = `${pct > 0 ? "+" : ""}${pct}% vs your normal`;
        deltaTone = Math.abs(pct) >= 15 ? "gold" : "soft";
      }
    }
  }

  return {
    metric,
    label: METRIC_INFO[metric].label,
    unit: METRIC_INFO[metric].unit,
    latest: latestRow.value,
    series: rows.slice(-SERIES_POINTS).map((r) => r.value),
    delta,
    deltaTone,
  };
}

/** Per-metric dashboard insights from daily rollups — personal baseline only. */
export function useInsights(): UseInsightsResult {
  const { session } = useAuth();
  const [insights, setInsights] = useState<MetricInsight[] | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    if (session === null) return;
    const since = localDay(startOfDayAgo(WINDOW_DAYS));
    const { data, error } = await supabase
      .from("metric_daily_rollups")
      .select("*")
      .gte("day", since)
      .order("day", { ascending: true });
    if (error !== null || data === null) {
      setInsights([]);
      return;
    }

    const byMetric = new Map<HealthMetric, MetricDailyRollupRow[]>();
    for (const row of data) {
      const list = byMetric.get(row.metric) ?? [];
      list.push(row);
      byMetric.set(row.metric, list);
    }

    const built: MetricInsight[] = [];
    for (const [metric, rows] of byMetric) {
      const insight = buildInsight(metric, rows);
      if (insight !== null) built.push(insight);
    }
    setInsights(built);
  }, [session]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { insights, refresh };
}
