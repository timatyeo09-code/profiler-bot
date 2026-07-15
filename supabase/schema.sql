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

create policy "profiles_read_own" on public.profiles for select using (id=auth.uid());
create policy "profiles_update_own" on public.profiles for update using (id=auth.uid());
create policy "cases_select_own" on public.cases for select using (created_by=auth.uid());
create policy "cases_insert_own" on public.cases for insert with check (created_by is null or created_by=auth.uid());
create policy "cases_update_own" on public.cases for update using (created_by=auth.uid());
create policy "cases_delete_own" on public.cases for delete using (created_by=auth.uid());
create policy "audit_select_own" on public.audit_log for select using (user_id=auth.uid());
create policy "audit_insert_own" on public.audit_log for insert with check (user_id=auth.uid());

create or replace function public.set_case_owner() returns trigger language plpgsql security definer as $$
begin
  if new.created_by is null then new.created_by := auth.uid(); end if;
  new.updated_at := now();
  return new;
end;$$;

drop trigger if exists trg_case_owner on public.cases;
create trigger trg_case_owner before insert or update on public.cases for each row execute function public.set_case_owner();
