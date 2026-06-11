import { supabase } from "@/lib/supabase";

import { getHealthProvider } from "./provider";
import { getEnabledMetrics, setLastSyncAt } from "./settings";

const SYNC_WINDOW_DAYS = 30;

/**
 * Read the trailing 30 days of rollups from the platform health store and
 * upsert them. Idempotent — (user_id, metric, day) is unique, so re-syncs
 * just refresh the same rows. Returns the number of rows written.
 */
export async function syncHealthData(): Promise<number> {
  const provider = getHealthProvider();
  if (provider === null) return 0;

  const metrics = await getEnabledMetrics();
  if (metrics.length === 0) return 0;

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (userId === undefined) return 0;

  const rollups = await provider.readDailyRollups(metrics, SYNC_WINDOW_DAYS);
  if (rollups.length === 0) return 0;

  const rows = rollups.map((r) => ({
    user_id: userId,
    metric: r.metric,
    day: r.day,
    value: r.value,
    min_value: r.minValue,
    max_value: r.maxValue,
    sample_count: r.sampleCount,
    unit: r.unit,
    source: provider.source,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("metric_daily_rollups")
    .upsert(rows, { onConflict: "user_id,metric,day" });
  if (error !== null) throw new Error(error.message);

  await setLastSyncAt(new Date().toISOString());
  return rows.length;
}
