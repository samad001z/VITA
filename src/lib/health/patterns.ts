import { type MetricDailyRollupRow } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

import { type HealthMetric, localDay, METRIC_INFO, startOfDayAgo } from "./types";

/**
 * "Normal You" pattern engine.
 * Baseline = median of the 30 days preceding the recent window; spread = MAD.
 * A pattern is a sustained drift: 5+ consecutive recent days all beyond
 * baseline ± 1.5×MAD in the same direction. Single-day noise never fires.
 * Comparisons are only ever against the user's own history.
 */

const LOOKBACK_DAYS = 45;
const RECENT_WINDOW_DAYS = 7;
const MIN_BASELINE_POINTS = 14;
const MIN_DRIFT_RUN = 5;
const MAD_MULTIPLIER = 1.5;
/** Don't re-announce the same metric's pattern within this many days. */
const DEDUPE_DAYS = 10;

interface DetectedPattern {
  metric: HealthMetric;
  direction: "above" | "below";
  recentAverage: number;
  baselineMedian: number;
  runLength: number;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const a = sorted[mid];
  const b = sorted[sorted.length % 2 === 0 ? mid - 1 : mid];
  return ((a ?? 0) + (b ?? 0)) / 2;
}

function detect(rows: MetricDailyRollupRow[]): DetectedPattern | null {
  const recentCutoff = localDay(startOfDayAgo(RECENT_WINDOW_DAYS - 1));
  const baseline = rows.filter((r) => r.day < recentCutoff).map((r) => r.value);
  const recent = rows.filter((r) => r.day >= recentCutoff).sort((a, b) => (a.day < b.day ? 1 : -1));

  if (baseline.length < MIN_BASELINE_POINTS || recent.length < MIN_DRIFT_RUN) return null;

  const base = median(baseline);
  const mad = median(baseline.map((v) => Math.abs(v - base)));
  if (mad <= 0) return null;
  const threshold = MAD_MULTIPLIER * mad;

  // Walk back from the newest day; count the consecutive same-direction run.
  let run = 0;
  let direction: "above" | "below" | null = null;
  for (const row of recent) {
    const deviation = row.value - base;
    if (Math.abs(deviation) <= threshold) break;
    const sign = deviation > 0 ? "above" : "below";
    if (direction === null) direction = sign;
    if (sign !== direction) break;
    run += 1;
  }
  if (direction === null || run < MIN_DRIFT_RUN) return null;

  const runRows = recent.slice(0, run);
  const recentAverage = runRows.reduce((sum, r) => sum + r.value, 0) / runRows.length;
  return { metric: runRows[0]?.metric ?? "steps", direction, recentAverage, baselineMedian: base, runLength: run };
}

function formatValue(metric: HealthMetric, value: number): string {
  if (metric === "sleep_minutes") {
    const h = Math.floor(value / 60);
    const m = Math.round(value % 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
  if (metric === "steps" || metric === "active_energy") {
    return Math.round(value).toLocaleString();
  }
  return value.toFixed(value < 10 ? 1 : 0);
}

function buildCopy(p: DetectedPattern): { title: string; summary: string } {
  const info = METRIC_INFO[p.metric];
  const diff = Math.abs(p.recentAverage - p.baselineMedian);
  const unit = p.metric === "sleep_minutes" ? "" : ` ${info.unit}`;
  return {
    title: `${info.label} ${p.direction} your normal`,
    summary:
      `Averaging ${formatValue(p.metric, p.recentAverage)}${unit} over the last ` +
      `${p.runLength} days — about ${formatValue(p.metric, diff)}${unit} ` +
      `${p.direction} your 30-day normal.`,
  };
}

/**
 * Detect drifts across all metrics and write new ones to the timeline as
 * 'pattern' events. Safe to call after every sync — duplicates are skipped.
 */
export async function detectAndRecordPatterns(): Promise<number> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (userId === undefined) return 0;

  const since = localDay(startOfDayAgo(LOOKBACK_DAYS));
  const { data: rollups, error } = await supabase
    .from("metric_daily_rollups")
    .select("*")
    .gte("day", since)
    .order("day", { ascending: true });
  if (error !== null || rollups === null) return 0;

  const byMetric = new Map<HealthMetric, MetricDailyRollupRow[]>();
  for (const row of rollups) {
    const list = byMetric.get(row.metric) ?? [];
    list.push(row);
    byMetric.set(row.metric, list);
  }

  const dedupeCutoff = localDay(startOfDayAgo(DEDUPE_DAYS));
  const { data: existing } = await supabase
    .from("timeline_events")
    .select("metric")
    .eq("event_type", "pattern")
    .gte("occurred_at", dedupeCutoff);
  const alreadyAnnounced = new Set((existing ?? []).map((e) => e.metric));

  let written = 0;
  for (const [metric, rows] of byMetric) {
    if (alreadyAnnounced.has(metric)) continue;
    const pattern = detect(rows);
    if (pattern === null) continue;
    const copy = buildCopy(pattern);
    const { error: insertError } = await supabase.from("timeline_events").insert({
      user_id: userId,
      report_id: null,
      event_type: "pattern",
      metric,
      title: copy.title,
      summary: copy.summary,
      occurred_at: localDay(new Date()),
    });
    if (insertError === null) written += 1;
  }
  return written;
}
