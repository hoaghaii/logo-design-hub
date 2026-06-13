-- LogoDesignHub — core schema
-- Extensions, enums, tables, indexes, and the auth->profile trigger.

create extension if not exists pgcrypto;

-- ---------- Enums ----------
create type user_role as enum ('client', 'designer');
create type job_status as enum ('open', 'in_progress', 'completed', 'cancelled');
create type application_status as enum ('pending', 'accepted', 'rejected');
create type deal_status as enum ('pending', 'accepted', 'countered', 'rejected');
create type order_status as enum ('pending_escrow', 'active', 'submitted', 'completed', 'rejected', 'refunded');
create type tx_type as enum ('escrow_lock', 'escrow_release', 'escrow_refund');
create type tx_status as enum ('pending', 'confirmed');

-- ---------- users (profile, 1:1 with auth.users) ----------
create table public.users (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text unique not null,
  full_name      text,
  role           user_role not null default 'client',
  avatar_url     text,
  bio            text,
  wallet_balance numeric not null default 10000000,
  created_at     timestamptz not null default now()
);

-- ---------- portfolios ----------
create table public.portfolios (
  id          uuid primary key default gen_random_uuid(),
  designer_id uuid not null references public.users(id) on delete cascade,
  title       text not null,
  image_url   text not null,
  category    text,
  created_at  timestamptz not null default now()
);
create index portfolios_designer_idx on public.portfolios(designer_id);

-- ---------- jobs ----------
create table public.jobs (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.users(id) on delete cascade,
  title       text not null,
  description text,
  budget      numeric not null,
  deadline    timestamptz,
  status      job_status not null default 'open',
  created_at  timestamptz not null default now()
);
create index jobs_client_idx on public.jobs(client_id);
create index jobs_status_idx on public.jobs(status);

-- ---------- applications ----------
create table public.applications (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid not null references public.jobs(id) on delete cascade,
  designer_id   uuid not null references public.users(id) on delete cascade,
  cover_note    text,
  portfolio_ids uuid[] not null default '{}',
  status        application_status not null default 'pending',
  created_at    timestamptz not null default now(),
  unique (job_id, designer_id)
);
create index applications_job_idx on public.applications(job_id);
create index applications_designer_idx on public.applications(designer_id);

-- ---------- deal_requests ----------
create table public.deal_requests (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  proposed_by    uuid not null references public.users(id) on delete cascade,
  proposed_price numeric not null,
  note           text,
  status         deal_status not null default 'pending',
  created_at     timestamptz not null default now()
);
create index deal_requests_application_idx on public.deal_requests(application_id);

-- ---------- orders ----------
create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  job_id           uuid not null references public.jobs(id) on delete cascade,
  client_id        uuid not null references public.users(id) on delete cascade,
  designer_id      uuid not null references public.users(id) on delete cascade,
  final_price      numeric not null,
  deadline         timestamptz not null,
  contract_address text,
  status           order_status not null default 'pending_escrow',
  created_at       timestamptz not null default now()
);
create index orders_client_idx on public.orders(client_id);
create index orders_designer_idx on public.orders(designer_id);
create index orders_status_idx on public.orders(status);

-- ---------- transactions ----------
create table public.transactions (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders(id) on delete cascade,
  from_user_id     uuid references public.users(id) on delete set null,
  to_user_id       uuid references public.users(id) on delete set null,
  type             tx_type not null,
  amount           numeric not null,
  contract_address text,
  tx_hash          text,
  status           tx_status not null default 'confirmed',
  created_at       timestamptz not null default now()
);
create index transactions_order_idx on public.transactions(order_id);

-- ---------- deliverables ----------
create table public.deliverables (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  file_url     text not null,
  is_locked    boolean not null default false,
  submitted_at timestamptz not null default now()
);
create index deliverables_order_idx on public.deliverables(order_id);

-- ---------- notifications (persistent + realtime feed) ----------
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  link       text,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, is_read);

-- ---------- auth -> profile trigger ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'client')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
