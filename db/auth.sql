-- Run in Supabase → SQL Editor. Idempotent.
-- Auth: profiles + plan + per-user query log for rate limiting.

create table if not exists profiles (
  id                       uuid primary key references auth.users(id) on delete cascade,
  email                    text,
  full_name                text,
  plan                     text not null default 'free' check (plan in ('free','pro')),
  stripe_customer_id       text unique,
  stripe_subscription_id   text unique,
  subscription_status      text,
  current_period_end       timestamptz,
  created_at               timestamptz not null default now()
);

alter table profiles add column if not exists stripe_customer_id     text unique;
alter table profiles add column if not exists stripe_subscription_id text unique;
alter table profiles add column if not exists subscription_status    text;
alter table profiles add column if not exists current_period_end     timestamptz;

alter table profiles enable row level security;

-- Users may read their own profile. All writes go through service_role
-- (Stripe webhook + checkout route), so `authenticated` gets no UPDATE/INSERT/DELETE
-- on profiles — this is what prevents clients from self-upgrading `plan`.
drop policy if exists "own profile read"   on profiles;
drop policy if exists "own profile update" on profiles;
create policy "own profile read" on profiles for select using (auth.uid() = id);

revoke insert, update, delete on profiles from authenticated, anon;

-- Auto-provision a profile row on new signup.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name',
             new.raw_user_meta_data->>'name',
             split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- Query log (per-user analytics + rate-limit source).
create table if not exists query_log (
  id            bigserial primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  question      text not null,
  sql           text,
  rows_returned integer,
  error         text,
  created_at    timestamptz not null default now()
);

alter table query_log enable row level security;

drop policy if exists "own query log read" on query_log;
create policy "own query log read" on query_log for select using (auth.uid() = user_id);

create index if not exists query_log_user_day_idx on query_log (user_id, created_at desc);
