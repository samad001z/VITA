-- VITA · Phase 7 · wearable health metrics
-- Tables: metric_samples (sparse, fine-grained), metric_daily_rollups (one row
-- per user/metric/day — the workhorse for Phase 8 baselines).
-- Non-negotiable: RLS enabled, user-scoped policies, same pattern as core schema.

-- ── metric_samples ───────────────────────────────────────────────────────────
-- Selective fine-grained samples (e.g. for symptom correlation). NOT the raw
-- firehose — the app only writes samples it has a reason to keep.

create table public.metric_samples (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  metric      text not null check (metric in
                ('heart_rate', 'sleep_minutes', 'steps', 'spo2', 'hrv', 'active_energy')),
  value       double precision not null,
  unit        text not null,
  measured_at timestamptz not null,
  source      text not null default 'unknown',
  created_at  timestamptz not null default now()
);

create index metric_samples_user_metric_time_idx
  on public.metric_samples (user_id, metric, measured_at desc);

alter table public.metric_samples enable row level security;

create policy "metric_samples_select_own" on public.metric_samples
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "metric_samples_insert_own" on public.metric_samples
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "metric_samples_update_own" on public.metric_samples
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "metric_samples_delete_own" on public.metric_samples
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ── metric_daily_rollups ─────────────────────────────────────────────────────
-- One row per user/metric/day. value semantics per metric:
--   heart_rate: daily average bpm · sleep_minutes: total minutes asleep
--   steps: daily sum · spo2: daily average % · hrv: daily average ms
--   active_energy: daily sum kcal

create table public.metric_daily_rollups (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  metric       text not null check (metric in
                 ('heart_rate', 'sleep_minutes', 'steps', 'spo2', 'hrv', 'active_energy')),
  day          date not null,
  value        double precision not null,
  min_value    double precision,
  max_value    double precision,
  sample_count integer not null default 0,
  unit         text not null,
  source       text not null default 'unknown',
  updated_at   timestamptz not null default now(),
  unique (user_id, metric, day)
);

create index metric_daily_rollups_user_metric_day_idx
  on public.metric_daily_rollups (user_id, metric, day desc);

alter table public.metric_daily_rollups enable row level security;

create policy "metric_rollups_select_own" on public.metric_daily_rollups
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "metric_rollups_insert_own" on public.metric_daily_rollups
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "metric_rollups_update_own" on public.metric_daily_rollups
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "metric_rollups_delete_own" on public.metric_daily_rollups
  for delete to authenticated
  using (user_id = (select auth.uid()));
