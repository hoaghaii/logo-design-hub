-- LogoDesignHub — Row Level Security
-- Money mutations happen through SECURITY DEFINER functions (0003), so write
-- policies here are deliberately conservative.

alter table public.users          enable row level security;
alter table public.portfolios     enable row level security;
alter table public.jobs           enable row level security;
alter table public.applications   enable row level security;
alter table public.deal_requests  enable row level security;
alter table public.orders         enable row level security;
alter table public.transactions   enable row level security;
alter table public.deliverables   enable row level security;
alter table public.notifications  enable row level security;

-- ---------- users ----------
-- Profiles are public to read (designer profiles, client names on jobs).
create policy "users read all" on public.users
  for select using (true);
create policy "users update self" on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---------- portfolios ----------
create policy "portfolios read all" on public.portfolios
  for select using (true);
create policy "portfolios owner write" on public.portfolios
  for all using (auth.uid() = designer_id) with check (auth.uid() = designer_id);

-- ---------- jobs ----------
create policy "jobs read all" on public.jobs
  for select using (true);
create policy "jobs owner insert" on public.jobs
  for insert with check (auth.uid() = client_id);
create policy "jobs owner update" on public.jobs
  for update using (auth.uid() = client_id) with check (auth.uid() = client_id);
create policy "jobs owner delete" on public.jobs
  for delete using (auth.uid() = client_id);

-- ---------- applications ----------
-- Visible to the applying designer and to the job's owner.
create policy "applications visible to parties" on public.applications
  for select using (
    auth.uid() = designer_id
    or auth.uid() = (select client_id from public.jobs j where j.id = job_id)
  );
create policy "applications designer insert" on public.applications
  for insert with check (auth.uid() = designer_id);
-- Designer may edit own; client (job owner) may accept/reject.
create policy "applications designer update" on public.applications
  for update using (auth.uid() = designer_id) with check (auth.uid() = designer_id);
create policy "applications client update" on public.applications
  for update using (
    auth.uid() = (select client_id from public.jobs j where j.id = job_id)
  );

-- ---------- deal_requests ----------
-- Visible to the two parties of the underlying application.
create policy "deals visible to parties" on public.deal_requests
  for select using (
    auth.uid() in (
      select a.designer_id from public.applications a where a.id = application_id
      union
      select j.client_id
        from public.applications a
        join public.jobs j on j.id = a.job_id
       where a.id = application_id
    )
  );
create policy "deals party insert" on public.deal_requests
  for insert with check (
    auth.uid() = proposed_by
    and auth.uid() in (
      select a.designer_id from public.applications a where a.id = application_id
      union
      select j.client_id
        from public.applications a
        join public.jobs j on j.id = a.job_id
       where a.id = application_id
    )
  );
create policy "deals party update" on public.deal_requests
  for update using (
    auth.uid() in (
      select a.designer_id from public.applications a where a.id = application_id
      union
      select j.client_id
        from public.applications a
        join public.jobs j on j.id = a.job_id
       where a.id = application_id
    )
  );

-- ---------- orders ----------
create policy "orders visible to parties" on public.orders
  for select using (auth.uid() = client_id or auth.uid() = designer_id);
create policy "orders client insert" on public.orders
  for insert with check (auth.uid() = client_id);
-- Status transitions are performed by SECURITY DEFINER functions; no direct
-- UPDATE policy is granted to clients/designers.

-- ---------- transactions ----------
create policy "transactions visible to parties" on public.transactions
  for select using (
    auth.uid() in (
      select client_id from public.orders o where o.id = order_id
      union
      select designer_id from public.orders o where o.id = order_id
    )
  );

-- ---------- deliverables ----------
create policy "deliverables visible to parties" on public.deliverables
  for select using (
    auth.uid() in (
      select client_id from public.orders o where o.id = order_id
      union
      select designer_id from public.orders o where o.id = order_id
    )
  );

-- ---------- notifications ----------
create policy "notifications read own" on public.notifications
  for select using (auth.uid() = user_id);
create policy "notifications update own" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
