import { useCallback, useEffect, useState } from "react";

import {
  type ObservationRow,
  type ReportRow,
  type TimelineEventRow,
} from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

interface UseReportDetailResult {
  report: ReportRow | null;
  event: TimelineEventRow | null;
  /** Observations grouped by category, in category order. */
  groups: { category: string; observations: ObservationRow[] }[] | null;
  error: string | null;
  refresh: () => Promise<void>;
}

/** Loads one report with its timeline summary and extracted values. */
export function useReportDetail(reportId: string): UseReportDetailResult {
  const { session } = useAuth();
  const [report, setReport] = useState<ReportRow | null>(null);
  const [event, setEvent] = useState<TimelineEventRow | null>(null);
  const [groups, setGroups] = useState<UseReportDetailResult["groups"]>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    if (session === null || reportId === "") return;

    const { data: reportRow, error: reportError } = await supabase
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .maybeSingle();
    if (reportError !== null) {
      setError(reportError.message);
      return;
    }
    if (reportRow === null) {
      setError("Report not found");
      return;
    }

    const { data: eventRow } = await supabase
      .from("timeline_events")
      .select("*")
      .eq("report_id", reportId)
      .maybeSingle();

    const { data: observations, error: obsError } = await supabase
      .from("extracted_observations")
      .select("*")
      .eq("report_id", reportId)
      .order("category", { ascending: true })
      .order("created_at", { ascending: true });
    if (obsError !== null) {
      setError(obsError.message);
      return;
    }

    const byCategory = new Map<string, ObservationRow[]>();
    for (const row of observations) {
      const list = byCategory.get(row.category) ?? [];
      list.push(row);
      byCategory.set(row.category, list);
    }

    setError(null);
    setReport(reportRow);
    setEvent(eventRow);
    setGroups(
      [...byCategory.entries()].map(([category, rows]) => ({
        category,
        observations: rows,
      })),
    );
  }, [session, reportId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { report, event, groups, error, refresh };
}
