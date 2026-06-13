-- LogoDesignHub — Realtime publication + Storage buckets/policies

-- ---------- Realtime (Postgres Changes) ----------
-- The app subscribes to these tables for live notifications (spec §6).
alter publication supabase_realtime add table public.deal_requests;
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.deliverables;
alter publication supabase_realtime add table public.notifications;

-- ---------- Storage buckets ----------
insert into storage.buckets (id, name, public)
values
  ('portfolios', 'portfolios', true),
  ('deliverables', 'deliverables', false)
on conflict (id) do nothing;

-- Portfolios: public read, owner (folder = auth uid) write.
create policy "portfolio images public read" on storage.objects
  for select using (bucket_id = 'portfolios');
create policy "portfolio owner upload" on storage.objects
  for insert with check (
    bucket_id = 'portfolios'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "portfolio owner delete" on storage.objects
  for delete using (
    bucket_id = 'portfolios'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Deliverables: private. Uploads land under the order id folder; the
-- designer uploads, and signed URLs are issued server-side for review.
create policy "deliverable authed upload" on storage.objects
  for insert with check (
    bucket_id = 'deliverables' and auth.role() = 'authenticated'
  );
create policy "deliverable authed read" on storage.objects
  for select using (
    bucket_id = 'deliverables' and auth.role() = 'authenticated'
  );
