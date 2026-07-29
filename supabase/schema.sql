-- BIL Professional Suite v4.0 - Supabase foundation
create extension if not exists pgcrypto;

create table if not exists public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organisation_id uuid references public.organisations(id),
  full_name text,
  role text not null default 'practitioner' check (role in ('practitioner','manager','administrator','read_only')),
  subscription_tier text not null default 'demo' check (subscription_tier in ('demo','pilot','professional','enterprise','admin')),
  account_status text not null default 'active' check (account_status in ('invited','active','suspended','cancelled')),
  access_expires_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists subscription_tier text not null default 'demo';
alter table public.profiles add column if not exists account_status text not null default 'active';
alter table public.profiles add column if not exists access_expires_at timestamptz;
alter table public.profiles add column if not exists stripe_customer_id text;
alter table public.profiles add column if not exists stripe_subscription_id text;

create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  tier text not null default 'demo' check (tier in ('demo','pilot','professional','enterprise','admin')),
  organisation_id uuid references public.organisations(id),
  access_days integer check (access_days is null or access_days > 0),
  expires_at timestamptz,
  used_at timestamptz,
  used_by uuid references auth.users(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  external_id text not null,
  organisation_id uuid references public.organisations(id),
  reference text,
  case_type text,
  subject_reference text,
  status text,
  risk_level text,
  assigned_practitioner text,
  review_date date,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(created_by, external_id)
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  organisation_id uuid references public.organisations(id),
  user_id uuid references auth.users(id),
  action text not null,
  case_id uuid references public.cases(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.organisations enable row level security;
alter table public.profiles enable row level security;
alter table public.cases enable row level security;
alter table public.audit_log enable row level security;
alter table public.invite_codes enable row level security;

create policy "profiles_read_own" on public.profiles for select using (id=auth.uid());
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own_name" on public.profiles
for update using (id=auth.uid()) with check (id=auth.uid());
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;
create policy "cases_select_own" on public.cases for select using (created_by=auth.uid());
create policy "cases_insert_own" on public.cases for insert with check (created_by is null or created_by=auth.uid());
create policy "cases_update_own" on public.cases for update using (created_by=auth.uid());
create policy "cases_delete_own" on public.cases for delete using (created_by=auth.uid());
create policy "audit_select_own" on public.audit_log for select using (user_id=auth.uid());
create policy "audit_insert_own" on public.audit_log for insert with check (user_id=auth.uid());

-- Invitation codes are deliberately unavailable through the browser client.
-- They are read and redeemed only by the server-side function using the
-- Supabase service-role key. Never expose that key in config.js or HTML.

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, subscription_tier, account_status)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), 'demo', 'active')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

create or replace function public.set_case_owner() returns trigger language plpgsql security definer as $$
begin
  if new.created_by is null then new.created_by := auth.uid(); end if;
  new.updated_at := now();
  return new;
end;$$;

drop trigger if exists trg_case_owner on public.cases;
create trigger trg_case_owner before insert or update on public.cases for each row execute function public.set_case_owner();
