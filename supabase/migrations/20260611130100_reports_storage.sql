-- VITA · Phase 2 · private storage bucket for report files
-- Files live under <user_id>/<report_id>.<ext> — the first path segment is the
-- owner's auth uid, and every storage policy checks it. Bucket is private;
-- the app reads files via short-lived signed URLs only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reports',
  'reports',
  false,
  20971520, -- 20 MB
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "reports_objects_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'reports'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "reports_objects_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'reports'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "reports_objects_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'reports'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'reports'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "reports_objects_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'reports'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
