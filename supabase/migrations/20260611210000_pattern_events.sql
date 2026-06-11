-- VITA · Phase 8 · "Normal You" pattern engine
-- timeline_events grows a second event type: 'pattern' — sustained personal-
-- baseline drifts detected on-device. Patterns carry the metric they concern.

alter table public.timeline_events
  drop constraint timeline_events_event_type_check;

alter table public.timeline_events
  add constraint timeline_events_event_type_check
  check (event_type in ('report', 'pattern'));

alter table public.timeline_events
  add column if not exists metric text
  check (metric is null or metric in
    ('heart_rate', 'sleep_minutes', 'steps', 'spo2', 'hrv', 'active_energy'));

-- Fast "is there already an open pattern for this metric?" lookups.
create index timeline_events_pattern_idx
  on public.timeline_events (user_id, metric, occurred_at desc)
  where event_type = 'pattern';
