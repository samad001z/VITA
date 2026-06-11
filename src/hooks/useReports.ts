import { useCallback, useEffect, useState } from "react";

import { type ReportRow } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

const POLL_MS = 3000;

interface UseReportsResult {
  reports: ReportRow[] | null;
  observationCounts: Record<string, number>;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Loads the user's reports newest-first and polls every 3s while any
 * report is still uploading/processing, so status cards update live.
 */
export function useReports(): UseReportsResult {
  const { session } = useAuth();
  const [reports, setReports] = useState<ReportRow[] | null>(null);
  const [observationCounts, setObservationCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    if (session === null) return;
    const { data, error: reportsError } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });
    if (reportsError !== null) {
      setError(reportsError.message);
      return;
    }
    setError(null);
    setReports(data);

    const { data: observations } = await supabase
      .from("extracted_observations")
      .select("report_id");
    if (observations !== null) {
      const counts: Record<string, number> = {};
      for (const row of observations) {
        counts[row.report_id] = (counts[row.report_id] ?? 0) + 1;
      }
      setObservationCounts(counts);
    }
  }, [session]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const active = reports?.some((r) => r.status === "uploaded" || r.status === "processing");
    if (active !== true) return;
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [reports, refresh]);

  return { reports, observationCounts, error, refresh };
}
