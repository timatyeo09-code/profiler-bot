-- Apply AFTER schema.sql. No changes to case permissions or organisation membership.
create table if not exists public.bil_usage_events (
 id uuid primary key,
 user_id uuid references auth.users(id) on delete set null,
 organisation_id uuid references public.organisations(id) on delete set null,
 event text not null check(event in ('access_checked','tool_opened','analysis_requested')),
 module text not null check(module in ('suite','child','adult','da','cases','dashboard','profiler','government','governance','guided','brief','cloud','admin','owner')),
 source text not null check(source in ('server','browser')),
 occurred_at timestamptz not null default now()
);
create index if not exists bil_usage_time on public.bil_usage_events(occurred_at);
create index if not exists bil_usage_user_time on public.bil_usage_events(user_id,occurred_at);
create table if not exists public.bil_daily_usage_reports (
 report_date date primary key,
 generated_at timestamptz not null default now(),
 payload jsonb not null
);
create table if not exists public.bil_reporting_config (
 id boolean primary key default true check(id),
 installed_at timestamptz not null default now()
);
insert into public.bil_reporting_config(id) values(true) on conflict do nothing;
alter table public.bil_usage_events enable row level security;
alter table public.bil_daily_usage_reports enable row level security;
alter table public.bil_reporting_config enable row level security;
revoke all on public.bil_usage_events,public.bil_daily_usage_reports,public.bil_reporting_config from public,anon,authenticated;
grant select,insert on public.bil_usage_events to service_role;
grant select,insert,update on public.bil_daily_usage_reports to service_role;
grant select on public.bil_reporting_config to service_role;

create or replace function public.bil_owner_overview(p_day date)
returns jsonb language sql security definer set search_path = '' as $$
with bounds as (
 select p_day::timestamp at time zone 'UTC' as start_at,(p_day+1)::timestamp at time zone 'UTC' as end_at
), day_events as (
 select e.* from public.bil_usage_events e,bounds b where e.occurred_at>=b.start_at and e.occurred_at<b.end_at
), user_activity as (
 select user_id,max(occurred_at) as last_activity from public.bil_usage_events group by user_id
), daily as (
 select g.day::date as day,count(distinct e.user_id) as active_users,count(e.id) filter(where e.event='analysis_requested') as analysis_requests
 from generate_series(p_day-13,p_day,interval '1 day') as g(day)
 left join public.bil_usage_events e on e.occurred_at>=g.day::date::timestamp at time zone 'UTC'
 and e.occurred_at<(g.day::date+1)::timestamp at time zone 'UTC'
 group by g.day order by g.day
), org_stats as (
 select e.organisation_id,count(distinct e.user_id) as active_users,
 count(*) filter(where e.event='tool_opened') as tool_opens,
 count(*) filter(where e.event='analysis_requested') as analysis_requests
 from day_events e group by e.organisation_id
), users as (
 select p.id,coalesce(nullif(p.full_name,''),'Unnamed account') as name,u.email,
 o.name as organisation,p.organisation_id,p.role,p.subscription_tier as tier,p.account_status as status,
 p.access_expires_at,p.created_at,u.email_confirmed_at,a.last_activity,
 (select count(*) from day_events e where e.user_id=p.id and e.event='analysis_requested') as analysis_requests,
 (select count(*) from day_events e where e.user_id=p.id and e.event='tool_opened') as tool_opens
 from public.profiles p join auth.users u on u.id=p.id
 left join public.organisations o on o.id=p.organisation_id
 left join user_activity a on a.user_id=p.id
 order by a.last_activity desc nulls last,p.created_at desc
), orgs as (
 select o.id,o.name,(select count(*) from public.profiles p where p.organisation_id=o.id) as registered_users,
 coalesce(s.active_users,0) as active_users,coalesce(s.tool_opens,0) as tool_opens,coalesce(s.analysis_requests,0) as analysis_requests
 from public.organisations o left join org_stats s on s.organisation_id=o.id
 union all
 select null,'Unassigned accounts',(select count(*) from public.profiles where organisation_id is null),
 coalesce(s.active_users,0),coalesce(s.tool_opens,0),coalesce(s.analysis_requests,0)
 from (select 1) x left join org_stats s on s.organisation_id is null
)
select jsonb_build_object(
 'date',p_day,'timezone','UTC',
 'coverage',jsonb_build_object('installed_at',(select installed_at from public.bil_reporting_config where id=true),'first_event_at',(select min(occurred_at) from public.bil_usage_events)),
 'totals',jsonb_build_object('registered_users',(select count(*) from public.profiles),
 'new_users',(select count(*) from public.profiles p,bounds b where p.created_at>=b.start_at and p.created_at<b.end_at),
 'active_users',(select count(distinct user_id) from day_events),
 'tool_opens',(select count(*) from day_events where event='tool_opened'),
 'analysis_requests',(select count(*) from day_events where event='analysis_requested')),
 'users',coalesce((select jsonb_agg(to_jsonb(u)) from users u),'[]'::jsonb),
 'organisations',coalesce((select jsonb_agg(to_jsonb(o)) from orgs o),'[]'::jsonb),
 'trend',coalesce((select jsonb_agg(to_jsonb(d)) from daily d),'[]'::jsonb),
 'modules',coalesce((select jsonb_agg(to_jsonb(m)) from (select module,count(*) as opens from day_events where event='tool_opened' group by module order by count(*) desc) m),'[]'::jsonb),
 'recent',coalesce((select jsonb_agg(to_jsonb(r)) from (select user_id,event,module,source,occurred_at from day_events order by occurred_at desc limit 100) r),'[]'::jsonb),
 'reports',coalesce((select jsonb_agg(to_jsonb(r)) from (select report_date,generated_at,payload from public.bil_daily_usage_reports order by report_date desc limit 30) r),'[]'::jsonb)
);
$$;
revoke all on function public.bil_owner_overview(date) from public,anon,authenticated;
grant execute on function public.bil_owner_overview(date) to service_role;
