-- Installing Darstudies as an app (PWA) is a paid perk, controlled by admins.
-- A user may install when they are an admin, when an admin has allowed them personally,
-- or when they have an active subscription on a plan that includes app install (the yearly plan by default).
-- An admin can also block a user personally, which overrides their plan.

alter table public.plans add column if not exists allow_install boolean not null default false;
update public.plans set allow_install = true where interval_days >= 365;

-- null = follow the plan, true = always allow, false = always block. Only admins can update profiles (RLS).
alter table public.profiles add column if not exists install_override boolean;

create or replace function public.can_install(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when p.is_admin then true
    when p.install_override is not null then p.install_override
    else exists (
      select 1 from subscriptions s join plans pl on pl.id = s.plan_id
      where s.user_id = p.id and s.status = 'active' and s.current_period_end > now() and pl.allow_install
    )
  end
  from profiles p where p.id = p_user
$$;

-- Same as before, plus `can_install`.
create or replace function public.get_my_access() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  p profiles;
  s app_settings;
  sub subscriptions;
  tier text;
  all_subjects text[] := '{phy,chem,bio,addmath,math,sej,pi,bm,bi}';
  all_features text[] := '{learn,quiz,flashcards,drill,tools,planner}';
begin
  select * into p from profiles where id = auth.uid();
  if not found then return null; end if;
  update profiles set last_seen_at = now() where id = p.id;
  select * into s from app_settings where id = 1;
  select * into sub from subscriptions where user_id = p.id;
  tier := access_tier();
  return jsonb_build_object(
    'tier', tier,
    'is_admin', p.is_admin,
    'email', p.email,
    'full_name', p.full_name,
    'trial_ends_at', p.trial_ends_at,
    'can_install', coalesce(can_install(p.id), false),
    'subscription', case when sub.id is null then null else jsonb_build_object(
      'status', sub.status,
      'current_period_end', sub.current_period_end,
      'plan', (select jsonb_build_object('name_en', name_en, 'name_bm', name_bm, 'allow_install', allow_install) from plans where id = sub.plan_id)
    ) end,
    'subjects', to_jsonb(case tier when 'full' then all_subjects when 'trial' then s.trial_subjects else s.free_subjects end),
    'features', to_jsonb(case tier when 'full' then all_features when 'trial' then s.trial_features else s.free_features end)
  );
end
$$;

-- The admin user list gains the install override and the resulting permission.
drop function if exists public.admin_list_users(text);
create function public.admin_list_users(p_search text default '') returns table (
  id uuid, email text, full_name text, provider text, is_admin boolean, trial_ends_at timestamptz,
  created_at timestamptz, last_seen_at timestamptz, subscription_id uuid, plan_id uuid, plan_name text,
  sub_status text, current_period_end timestamptz, tier text, install_override boolean, can_install boolean
) language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not authorised'; end if;
  return query
  select p.id, p.email, p.full_name, p.provider, p.is_admin, p.trial_ends_at, p.created_at, p.last_seen_at,
    s.id, s.plan_id, pl.name_en, s.status, s.current_period_end,
    case when p.is_admin or (s.status = 'active' and s.current_period_end > now()) then 'full'
      when p.trial_ends_at > now() then 'trial' else 'expired' end,
    p.install_override,
    coalesce(can_install(p.id), false)
  from profiles p
  left join subscriptions s on s.user_id = p.id
  left join plans pl on pl.id = s.plan_id
  where coalesce(p_search, '') = ''
     or p.email ilike '%' || p_search || '%'
     or p.full_name ilike '%' || p_search || '%'
  order by p.created_at desc
  limit 500;
end
$$;
