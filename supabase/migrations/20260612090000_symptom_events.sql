-- VITA · Phase 9 · quick symptom log
-- timeline_events grows a third event type: 'symptom' — moments the user
-- logs by hand ("Headache · moderate"). They sit on the same timeline and
-- flow into chat grounding like every other event.

alter table public.timeline_events
  drop constraint timeline_events_event_type_check;

alter table public.timeline_events
  add constraint timeline_events_event_type_check
  check (event_type in ('report', 'pattern', 'symptom'));
