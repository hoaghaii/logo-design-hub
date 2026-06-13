-- deal_messages: unified real-time chat + price-proposal feed for the deal room.
-- Replaces the deal_requests table in the UI (deal_requests kept for backward compat).

create table public.deal_messages (
  id               uuid primary key default gen_random_uuid(),
  application_id   uuid not null references public.applications(id) on delete cascade,
  sender_id        uuid not null references public.users(id) on delete cascade,
  type             text not null default 'text'
                     check (type in ('text', 'price_proposal')),
  content          text,
  proposed_price   numeric,
  proposal_status  text default null
                     check (proposal_status in ('pending', 'accepted', 'countered', 'rejected')),
  created_at       timestamptz not null default now()
);

create index deal_messages_application_idx on public.deal_messages(application_id);

-- Helper: true if auth.uid() is either party to the application.
create or replace function public.is_deal_party(app_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.applications a
    join public.jobs j on j.id = a.job_id
    where a.id = app_id
      and (a.designer_id = auth.uid() or j.client_id = auth.uid())
  )
$$;

revoke execute on function public.is_deal_party(uuid) from public, anon;
grant  execute on function public.is_deal_party(uuid) to authenticated;

alter table public.deal_messages enable row level security;

create policy "deal_messages party read" on public.deal_messages
  for select using (public.is_deal_party(application_id));

create policy "deal_messages party insert" on public.deal_messages
  for insert with check (
    auth.uid() = sender_id
    and public.is_deal_party(application_id)
  );

create policy "deal_messages party update" on public.deal_messages
  for update using (public.is_deal_party(application_id));

-- Realtime broadcast
alter publication supabase_realtime add table public.deal_messages;
