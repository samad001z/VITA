import { useCallback, useEffect, useState } from "react";

import { type ReportRow, type TimelineEventRow } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

const POLL_MS = 3000;

export interface ObservationStats {
  count: number;
  flagged: number;
}

interface UseTimelineResult {
  /** Processed reports as chronological events, newest first. */
  events: TimelineEventRow[] | null;
  /** Reports still uploading, processing, or failed — not yet on the timeline. */
  pending: ReportRow[] | null;
  /** Per-report observation totals, keyed by report id. */
  stats: Record<string, ObservationStats>;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Loads the health timeline: processed reports appear as timeline_events
 * (newest first), unprocessed ones surface in a pending strip. Polls every
 * 3s while any report is still uploading/processing so cards update live
 * and finished reports slide into the timeline.
 */
export function useTimeline(): UseTimelineResult {
  const { session } = useAuth();
  const [events, setEvents] = useState<TimelineEventRow[] | null>(null);
  const [pending, setPending] = useState<ReportRow[] | null>(null);
  const [stats, setStats] = useState<Record<string, ObservationStats>>({});
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    if (session === null) return;

    const { data: eventRows, error: eventsError } = await supabase
      .from("timeline_events")
      .select("*")
      .order("occurred_at", { ascending: false })
      .order("created_at", { ascending: false });
    if (eventsError !== null) {
      setError(eventsError.message);
      return;
    }

    const { data: pendingRows, error: pendingError } = await supabase
      .from("reports")
      .select("*")
      .in("status", ["uploaded", "processing", "failed"])
      .order("created_at", { ascending: false });
    if (pendingError !== null) {
      setError(pendingError.message);
      return;
    }

    setError(null);
    setEvents(eventRows);
    setPending(pendingRows);

    const { data: observations } = await supabase
      .from("extracted_observations")
      .select("report_id, flagged");
    if (observations !== null) {
      const next: Record<string, ObservationStats> = {};
      for (const row of observations) {
        const entry = (next[row.report_id] ??= { count: 0, flagged: 0 });
        entry.count += 1;
        if (row.flagged) entry.flagged += 1;
      }
      setStats(next);
    }
  }, [session]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const active = pending?.some((r) => r.status === "uploaded" || r.status === "processing");
    if (active !== true) return;
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [pending, refresh]);

  return { events, pending, stats, error, refresh };
}
