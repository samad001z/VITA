-- VITA · Phase 2 · core schema
-- Tables: profiles, reports, extracted_observations, timeline_events, share_tokens
-- Non-negotiable: RLS enabled on every table. Health data is never readable cross-user.
-- All policies use (select auth.uid()) so the planner can cache the call per statement.

-- ── helpers ──────────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ── profiles ─────────────────────────────────────────────────────────────────
-- One row per auth user, created automatically on signup.

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text,
  date_of_birth date,
  sex           text check (sex in ('female', 'male', 'other', 'undisclosed')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Auto-create a profile when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for users who signed up during Phase 1.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- ── reports ──────────────────────────────────────────────────────────────────
-- One row per uploaded medical report file (PDF or photo).

create table public.reports (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  title         text not null default 'Medical report',
  report_date   date,
  file_path     text not null,
  file_type     text not null check (file_type in ('pdf', 'image')),
  status        text not null default 'uploaded'
                  check (status in ('uploaded', 'processing', 'processed', 'failed')),
  error_message text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index reports_user_date_idx
  on public.reports (user_id, report_date desc nulls last);

alter table public.reports enable row level security;

create trigger reports_set_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();

create policy "reports_select_own" on public.reports
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "reports_insert_own" on public.reports
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "reports_update_own" on public.reports
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "reports_delete_own" on public.reports
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ── extracted_observations ───────────────────────────────────────────────────
-- Structured values pulled out of a report by the AI extraction pipeline.
-- Every row is validated against the Pydantic schema before it gets here.

create table public.extracted_observations (
  id              uuid primary key default gen_random_uuid(),
  report_id       uuid not null references public.reports (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  test_name       text not null,
  value           text not null,
  value_numeric   numeric,
  unit            text,
  reference_range text,
  observed_at     date,
  category        text not null default 'general',
  flagged         boolean not null default false,
  created_at      timestamptz not null default now()
);

create index extracted_observations_report_idx
  on public.extracted_observations (report_id);
create index extracted_observations_user_test_idx
  on public.extracted_observations (user_id, test_name, observed_at desc nulls last);

alter table public.extracted_observations enable row level security;

create policy "observations_select_own" on public.extracted_observations
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Insert requires owning both the row and the parent report,
-- so nobody can attach observations to another user's report.
create policy "observations_insert_own" on public.extracted_observations
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.reports r
      where r.id = report_id and r.user_id = (select auth.uid())
    )
  );

create policy "observations_update_own" on public.extracted_observations
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "observations_delete_own" on public.extracted_observations
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ── timeline_events ──────────────────────────────────────────────────────────
-- Chronological entries that power the Health Timeline.
-- Wedge scope: events come from reports only.

create table public.timeline_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  report_id   uuid references public.reports (id) on delete cascade,
  event_type  text not null default 'report' check (event_type in ('report')),
  title       text not null,
  summary     text,
  occurred_at date not null,
  created_at  timestamptz not null default now()
);

create index timeline_events_user_date_idx
  on public.timeline_events (user_id, occurred_at desc);

alter table public.timeline_events enable row level security;

create policy "timeline_select_own" on public.timeline_events
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "timeline_insert_own" on public.timeline_events
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      report_id is null
      or exists (
        select 1 from public.reports r
        where r.id = report_id and r.user_id = (select auth.uid())
      )
    )
  );

create policy "timeline_update_own" on public.timeline_events
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "timeline_delete_own" on public.timeline_events
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ── share_tokens ─────────────────────────────────────────────────────────────
-- Doctor QR sharing. Only the SHA-256 hash of a token is stored; the raw
-- token lives solely in the QR code. Single-use (used_at), 30-minute maximum
-- lifetime (enforced by check constraint), revocable (revoked_at).
-- Doctors never touch this table directly — Phase 6 adds a SECURITY DEFINER
-- RPC that validates a presented token server-side. No anon policies exist.

create table public.share_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at    timestamptz,
  revoked_at timestamptz,
  scope      jsonb not null default '{"sections": ["observations", "timeline"]}'::jsonb,
  created_at timestamptz not null default now(),
  constraint share_tokens_max_ttl
    check (expires_at <= created_at + interval '30 minutes')
);

create index share_tokens_user_idx on public.share_tokens (user_id, created_at desc);

alter table public.share_tokens enable row level security;

create policy "share_tokens_select_own" on public.share_tokens
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "share_tokens_insert_own" on public.share_tokens
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "share_tokens_update_own" on public.share_tokens
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "share_tokens_delete_own" on public.share_tokens
  for delete to authenticated
  using (user_id = (select auth.uid()));
