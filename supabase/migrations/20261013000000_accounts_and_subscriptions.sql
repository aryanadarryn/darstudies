-- Accounts, trial, subscriptions, payments and protected content for Darstudies.
-- Apply with `supabase db push` or paste into the Supabase SQL editor.

-- ---------------------------------------------------------------------------
-- Settings (single row). Edited from the in-app admin screen.
-- Features: learn (chapter intros + notes), quiz, flashcards, drill, tools, planner.
-- ---------------------------------------------------------------------------
create table public.app_settings (
  id int primary key default 1 check (id = 1),
  trial_days int not null default 7 check (trial_days between 0 and 365),
  trial_subjects text[] not null default '{phy,chem,bio,addmath,math,sej,pi,bm,bi}',
  trial_features text[] not null default '{learn,quiz,planner}',
  free_subjects text[] not null default '{}',
  free_features text[] not null default '{}',
  updated_at timestamptz not null default now()
);
insert into public.app_settings (id) values (1);

-- ---------------------------------------------------------------------------
-- Profiles: one per auth user, created by trigger on sign-up.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  provider text,
  is_admin boolean not null default false,
  trial_ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);
create index profiles_email_idx on public.profiles (lower(email));

-- ---------------------------------------------------------------------------
-- Plans (prices in sen, MYR).
-- ---------------------------------------------------------------------------
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_bm text not null,
  price_sen int not null check (price_sen >= 100),
  interval_days int not null check (interval_days > 0),
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
insert into public.plans (name_en, name_bm, price_sen, interval_days, sort) values
  ('Monthly', 'Bulanan', 1490, 30, 1),
  ('Yearly', 'Tahunan', 11900, 365, 2);

-- ---------------------------------------------------------------------------
-- Subscriptions: one row per user, extended by each paid renewal.
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  plan_id uuid references public.plans (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Payments: one row per checkout attempt. Kept when a user is deleted (accounting).
-- ---------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  email text,
  plan_id uuid references public.plans (id) on delete set null,
  plan_name text,
  amount_sen int not null,
  currency text not null default 'MYR',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  method text,
  gateway_ref text unique,
  checkout_url text,
  raw jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index payments_user_idx on public.payments (user_id, created_at desc);
create index payments_status_idx on public.payments (status, created_at desc);

-- ---------------------------------------------------------------------------
-- Protected learning content, uploaded by scripts/upload-content.ts.
-- feature: learn | quiz | flashcards (decides who may read the row).
-- ---------------------------------------------------------------------------
create table public.content (
  id text primary key,
  kind text not null check (kind in ('intro', 'questions', 'notes', 'flashcards')),
  feature text not null check (feature in ('learn', 'quiz', 'flashcards')),
  subject_id text not null,
  chapter_id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index content_kind_idx on public.content (kind);

-- ---------------------------------------------------------------------------
-- Access logic
-- ---------------------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false)
$$;

create or replace function public.has_active_subscription(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from subscriptions
    where user_id = p_user and status = 'active' and current_period_end > now()
  )
$$;

/** 'full' (admin or paid), 'trial' or 'expired' for the signed-in user; null when signed out. */
create or replace function public.access_tier() returns text
language sql stable security definer set search_path = public as $$
  select case
    when p.is_admin or has_active_subscription(p.id) then 'full'
    when p.trial_ends_at > now() then 'trial'
    else 'expired'
  end
  from profiles p where p.id = auth.uid()
$$;

create or replace function public.can_access(p_subject text, p_feature text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case access_tier()
      when 'full' then true
      when 'trial' then p_subject = any (s.trial_subjects) and p_feature = any (s.trial_features)
      when 'expired' then p_subject = any (s.free_subjects) and p_feature = any (s.free_features)
      else false
    end
    from app_settings s where s.id = 1
  ), false)
$$;

/** Everything the app needs to decide what to unlock, in one call. */
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
    'subscription', case when sub.id is null then null else jsonb_build_object(
      'status', sub.status,
      'current_period_end', sub.current_period_end,
      'plan', (select jsonb_build_object('name_en', name_en, 'name_bm', name_bm) from plans where id = sub.plan_id)
    ) end,
    'subjects', to_jsonb(case tier when 'full' then all_subjects when 'trial' then s.trial_subjects else s.free_subjects end),
    'features', to_jsonb(case tier when 'full' then all_features when 'trial' then s.trial_features else s.free_features end)
  );
end
$$;

-- ---------------------------------------------------------------------------
-- New user → profile with a trial
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, avatar_url, provider, trial_ends_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_app_meta_data ->> 'provider',
    now() + make_interval(days => (select trial_days from app_settings where id = 1))
  );
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Payment confirmation (called only by the payment Edge Functions with the service role).
-- Idempotent: confirming the same payment twice extends the subscription once.
-- ---------------------------------------------------------------------------
create or replace function public.apply_payment(p_payment uuid, p_method text default null, p_raw jsonb default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  pay payments;
  days int;
begin
  select * into pay from payments where id = p_payment for update;
  if not found then raise exception 'payment % not found', p_payment; end if;
  if pay.status = 'paid' then return; end if;
  if pay.user_id is null then raise exception 'payment % has no user', p_payment; end if;

  select interval_days into days from plans where id = pay.plan_id;
  if days is null then raise exception 'plan for payment % not found', p_payment; end if;

  update payments set status = 'paid', paid_at = now(), method = coalesce(p_method, method), raw = coalesce(p_raw, raw)
  where id = p_payment;

  insert into subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
  values (pay.user_id, pay.plan_id, 'active', now(), now() + make_interval(days => days))
  on conflict (user_id) do update set
    plan_id = excluded.plan_id,
    status = 'active',
    -- Renewing early adds the new period on top of the time that is left.
    current_period_start = case when subscriptions.current_period_end > now() and subscriptions.status = 'active'
      then subscriptions.current_period_start else now() end,
    current_period_end = case when subscriptions.current_period_end > now() and subscriptions.status = 'active'
      then subscriptions.current_period_end + make_interval(days => days) else now() + make_interval(days => days) end,
    updated_at = now();
end
$$;

-- ---------------------------------------------------------------------------
-- Admin helpers
-- ---------------------------------------------------------------------------
create or replace function public.admin_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not authorised'; end if;
  return jsonb_build_object(
    'users', (select count(*) from profiles),
    'new_users_7d', (select count(*) from profiles where created_at > now() - interval '7 days'),
    'active_subscriptions', (select count(*) from subscriptions where status = 'active' and current_period_end > now()),
    'expired_subscriptions', (select count(*) from subscriptions where not (status = 'active' and current_period_end > now())),
    'on_trial', (select count(*) from profiles p where p.trial_ends_at > now() and not p.is_admin and not has_active_subscription(p.id)),
    'trial_ended_unpaid', (select count(*) from profiles p where p.trial_ends_at <= now() and not p.is_admin and not has_active_subscription(p.id)),
    'revenue_month_sen', (select coalesce(sum(amount_sen), 0) from payments where status = 'paid' and paid_at >= date_trunc('month', now())),
    'revenue_total_sen', (select coalesce(sum(amount_sen), 0) from payments where status = 'paid'),
    'pending_payments', (select count(*) from payments where status = 'pending' and created_at > now() - interval '1 day')
  );
end
$$;

/** Users joined with their subscription, for the admin user list. */
create or replace function public.admin_list_users(p_search text default '') returns table (
  id uuid, email text, full_name text, provider text, is_admin boolean, trial_ends_at timestamptz,
  created_at timestamptz, last_seen_at timestamptz, subscription_id uuid, plan_id uuid, plan_name text,
  sub_status text, current_period_end timestamptz, tier text
) language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not authorised'; end if;
  return query
  select p.id, p.email, p.full_name, p.provider, p.is_admin, p.trial_ends_at, p.created_at, p.last_seen_at,
    s.id, s.plan_id, pl.name_en, s.status, s.current_period_end,
    case when p.is_admin or (s.status = 'active' and s.current_period_end > now()) then 'full'
      when p.trial_ends_at > now() then 'trial' else 'expired' end
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

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.app_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.content enable row level security;

create policy "settings readable" on public.app_settings for select to authenticated using (true);
create policy "settings admin update" on public.app_settings for update to authenticated using (is_admin()) with check (is_admin());

create policy "own profile" on public.profiles for select to authenticated using (id = auth.uid() or is_admin());
create policy "admin update profiles" on public.profiles for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin delete profiles" on public.profiles for delete to authenticated using (is_admin());

create policy "plans readable" on public.plans for select to authenticated using (active or is_admin());
create policy "admin insert plans" on public.plans for insert to authenticated with check (is_admin());
create policy "admin update plans" on public.plans for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin delete plans" on public.plans for delete to authenticated using (is_admin());

create policy "own subscription" on public.subscriptions for select to authenticated using (user_id = auth.uid() or is_admin());
create policy "admin insert subscriptions" on public.subscriptions for insert to authenticated with check (is_admin());
create policy "admin update subscriptions" on public.subscriptions for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin delete subscriptions" on public.subscriptions for delete to authenticated using (is_admin());

create policy "own payments" on public.payments for select to authenticated using (user_id = auth.uid() or is_admin());
create policy "admin update payments" on public.payments for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin delete payments" on public.payments for delete to authenticated using (is_admin());

create policy "content by access" on public.content for select to authenticated using (can_access(subject_id, feature));

-- Only the service role (Edge Functions, upload script) may confirm payments.
revoke execute on function public.apply_payment(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
