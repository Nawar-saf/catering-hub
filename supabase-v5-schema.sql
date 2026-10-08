-- Gulf Catering Hub V5 — launch-ready Production MVP schema + Auth/RLS hardening
-- Run once in Supabase SQL Editor before using the V5 portals.
-- Preserves existing requests and restricts their management to operations admins.

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'company',
  created_at timestamptz not null default now()
);

create table if not exists public.catering_providers (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid unique references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  service_areas text[] default '{}',
  cuisines text[] default '{}',
  max_capacity int default 0,
  lead_time_hours int default 24,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid unique references auth.users(id) on delete cascade,
  name text not null,
  monthly_budget numeric default 0,
  approver_name text,
  preferred_provider_id uuid references public.catering_providers(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.company_branches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  city text,
  address text,
  created_at timestamptz not null default now()
);

create table if not exists public.catering_packages (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.catering_providers(id) on delete cascade,
  name text not null,
  category text,
  price_per_person numeric not null,
  min_people int default 1,
  max_people int default 9999,
  lead_time_hours int default 24,
  items jsonb default '[]'::jsonb,
  active boolean not null default false,
  review_status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists public.company_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.company_branches(id) on delete set null,
  package_id uuid references public.catering_packages(id) on delete set null,
  provider_id uuid references public.catering_providers(id) on delete set null,
  order_type text not null,
  event_date timestamptz,
  people_count int,
  estimated_total numeric default 0,
  details jsonb default '{}'::jsonb,
  status text not null default 'pending_approval',
  requested_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  assigned_at timestamptz,
  provider_responded_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.recurring_meal_plans (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.company_branches(id) on delete set null,
  employees int not null,
  days_per_week int not null,
  price_per_employee numeric,
  preferences jsonb default '{}'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- Upgrade earlier V3/V4 tables when present.
alter table public.catering_providers add column if not exists owner_user_id uuid references auth.users(id) on delete cascade;
alter table public.catering_packages add column if not exists review_status text not null default 'draft';
alter table public.companies add column if not exists owner_user_id uuid references auth.users(id) on delete cascade;
alter table public.companies add column if not exists approver_name text;
alter table public.company_orders add column if not exists provider_id uuid references public.catering_providers(id) on delete set null;
alter table public.company_orders add column if not exists approved_at timestamptz;
alter table public.company_orders add column if not exists assigned_at timestamptz;
alter table public.company_orders add column if not exists provider_responded_at timestamptz;
alter table public.company_orders add column if not exists completed_at timestamptz;

create unique index if not exists companies_owner_user_uidx on public.companies(owner_user_id) where owner_user_id is not null;
create unique index if not exists providers_owner_user_uidx on public.catering_providers(owner_user_id) where owner_user_id is not null;
create index if not exists company_orders_company_idx on public.company_orders(company_id, created_at desc);
create index if not exists company_orders_provider_idx on public.company_orders(provider_id, created_at desc);
create index if not exists packages_provider_idx on public.catering_packages(provider_id, active);

-- Add data constraints. NOT VALID keeps existing legacy V3/V4 data from blocking migration,
-- while PostgreSQL still enforces the constraints on new/updated rows.
do $$ begin
  alter table public.user_profiles add constraint user_profiles_role_chk check (role in ('company','provider','admin')) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.catering_providers add constraint providers_status_chk check (status in ('pending','approved','suspended')) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.catering_providers add constraint providers_capacity_chk check (max_capacity >= 0 and lead_time_hours >= 0) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.catering_packages add constraint packages_review_chk check (review_status in ('draft','pending_review','approved','rejected')) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.catering_packages add constraint packages_numbers_chk check (price_per_person > 0 and min_people >= 1 and max_people >= min_people and lead_time_hours >= 0) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.company_orders add constraint orders_status_chk check (status in ('pending_approval','approved','sent_to_provider','provider_accepted','provider_rejected','completed','cancelled')) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.company_orders add constraint orders_numbers_chk check ((people_count is null or people_count > 0) and estimated_total >= 0) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.recurring_meal_plans add constraint recurring_status_chk check (status in ('pending','active','paused','cancelled')) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.recurring_meal_plans add constraint recurring_numbers_chk check (employees > 0 and days_per_week between 1 and 7 and (price_per_employee is null or price_per_employee >= 0)) not valid;
exception when duplicate_object then null; end $$;

-- Safe profile creation. Signup metadata can request only company/provider; never admin.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = pg_catalog, public
as $$
declare requested_role text;
begin
  requested_role := coalesce(new.raw_user_meta_data->>'role','company');
  if requested_role not in ('company','provider') then requested_role := 'company'; end if;
  insert into public.user_profiles(id,full_name,phone,role)
  values(new.id,new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'phone',requested_role)
  on conflict(id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure private.handle_new_user();

insert into public.user_profiles(id,full_name,phone,role)
select id, raw_user_meta_data->>'full_name', raw_user_meta_data->>'phone',
       case when raw_user_meta_data->>'role'='provider' then 'provider' else 'company' end
from auth.users
on conflict(id) do nothing;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path=pg_catalog,public
as $$ select auth.uid() is not null and exists(select 1 from public.user_profiles p where p.id=auth.uid() and p.role='admin') $$;

create or replace function private.my_role()
returns text language sql stable security definer set search_path=pg_catalog,public
as $$ select role from public.user_profiles where auth.uid() is not null and id=auth.uid() limit 1 $$;

create or replace function private.my_company_id()
returns uuid language sql stable security definer set search_path=pg_catalog,public
as $$ select id from public.companies where auth.uid() is not null and owner_user_id=auth.uid() limit 1 $$;

create or replace function private.my_provider_id()
returns uuid language sql stable security definer set search_path=pg_catalog,public
as $$ select id from public.catering_providers where auth.uid() is not null and owner_user_id=auth.uid() limit 1 $$;

alter table public.user_profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_branches enable row level security;
alter table public.catering_providers enable row level security;
alter table public.catering_packages enable row level security;
alter table public.company_orders enable row level security;
alter table public.recurring_meal_plans enable row level security;

-- Profiles: users can read/update their profile, but role changes are guarded by trigger below.
drop policy if exists profile_self_select on public.user_profiles;
create policy profile_self_select on public.user_profiles for select to authenticated using (id=auth.uid() or private.is_admin());
drop policy if exists profile_self_update on public.user_profiles;
create policy profile_self_update on public.user_profiles for update to authenticated using (id=auth.uid() or private.is_admin()) with check (id=auth.uid() or private.is_admin());

-- Clean up V4 read-only compatibility policies before defining the V5 equivalents.
drop policy if exists company_assigned_provider_read on public.companies;
drop policy if exists branch_assigned_provider_read on public.company_branches;

-- Companies.
drop policy if exists company_owner_all on public.companies;
drop policy if exists company_owner_select on public.companies;
create policy company_owner_select on public.companies for select to authenticated using (
  owner_user_id=auth.uid() or private.is_admin() or exists(
    select 1 from public.company_orders o where o.company_id=companies.id and o.provider_id=private.my_provider_id()
  )
);
drop policy if exists company_owner_insert on public.companies;
create policy company_owner_insert on public.companies for insert to authenticated with check (
  private.is_admin() or (private.my_role()='company' and owner_user_id=auth.uid())
);
drop policy if exists company_owner_update on public.companies;
create policy company_owner_update on public.companies for update to authenticated using (owner_user_id=auth.uid() or private.is_admin()) with check (owner_user_id=auth.uid() or private.is_admin());
drop policy if exists company_owner_delete on public.companies;
create policy company_owner_delete on public.companies for delete to authenticated using (owner_user_id=auth.uid() or private.is_admin());

-- Branches.
drop policy if exists company_branch_owner_all on public.company_branches;
drop policy if exists company_branch_select on public.company_branches;
create policy company_branch_select on public.company_branches for select to authenticated using (
  company_id=private.my_company_id() or private.is_admin() or exists(
    select 1 from public.company_orders o where o.branch_id=company_branches.id and o.provider_id=private.my_provider_id()
  )
);
drop policy if exists company_branch_insert on public.company_branches;
create policy company_branch_insert on public.company_branches for insert to authenticated with check (company_id=private.my_company_id() or private.is_admin());
drop policy if exists company_branch_update on public.company_branches;
create policy company_branch_update on public.company_branches for update to authenticated using (company_id=private.my_company_id() or private.is_admin()) with check (company_id=private.my_company_id() or private.is_admin());
drop policy if exists company_branch_delete on public.company_branches;
create policy company_branch_delete on public.company_branches for delete to authenticated using (company_id=private.my_company_id() or private.is_admin());

-- Providers: public reads approved providers; provider role manages only its own record.
drop policy if exists providers_public_read on public.catering_providers;
create policy providers_public_read on public.catering_providers for select to anon, authenticated using (status='approved' or owner_user_id=auth.uid() or private.is_admin());
drop policy if exists providers_owner_insert on public.catering_providers;
create policy providers_owner_insert on public.catering_providers for insert to authenticated with check (
  private.is_admin() or (private.my_role()='provider' and owner_user_id=auth.uid() and status='pending')
);
drop policy if exists providers_owner_update on public.catering_providers;
create policy providers_owner_update on public.catering_providers for update to authenticated using (owner_user_id=auth.uid() or private.is_admin()) with check (owner_user_id=auth.uid() or private.is_admin());

-- Packages: only approved/active packages are public. Provider cannot self-publish.
drop policy if exists packages_public_read on public.catering_packages;
create policy packages_public_read on public.catering_packages for select to anon, authenticated using (
  (active=true and review_status='approved' and exists(select 1 from public.catering_providers p where p.id=provider_id and p.status='approved'))
  or provider_id=private.my_provider_id() or private.is_admin()
);
drop policy if exists packages_provider_insert on public.catering_packages;
create policy packages_provider_insert on public.catering_packages for insert to authenticated with check (
  private.is_admin() or (private.my_role()='provider' and provider_id=private.my_provider_id() and active=false and review_status='draft')
);
drop policy if exists packages_provider_update on public.catering_packages;
create policy packages_provider_update on public.catering_packages for update to authenticated using (provider_id=private.my_provider_id() or private.is_admin()) with check (provider_id=private.my_provider_id() or private.is_admin());

-- Orders.
drop policy if exists orders_company_read on public.company_orders;
create policy orders_company_read on public.company_orders for select to authenticated using (company_id=private.my_company_id() or provider_id=private.my_provider_id() or private.is_admin());
drop policy if exists orders_company_insert on public.company_orders;
create policy orders_company_insert on public.company_orders for insert to authenticated with check (
  private.is_admin() or (private.my_role()='company' and company_id=private.my_company_id())
);
drop policy if exists orders_company_update on public.company_orders;
create policy orders_company_update on public.company_orders for update to authenticated using (company_id=private.my_company_id() or provider_id=private.my_provider_id() or private.is_admin()) with check (company_id=private.my_company_id() or provider_id=private.my_provider_id() or private.is_admin());

-- Recurring meal plans.
drop policy if exists recurring_company_all on public.recurring_meal_plans;
drop policy if exists recurring_company_select on public.recurring_meal_plans;
create policy recurring_company_select on public.recurring_meal_plans for select to authenticated using (company_id=private.my_company_id() or private.is_admin());
drop policy if exists recurring_company_insert on public.recurring_meal_plans;
create policy recurring_company_insert on public.recurring_meal_plans for insert to authenticated with check (company_id=private.my_company_id() or private.is_admin());
drop policy if exists recurring_company_update on public.recurring_meal_plans;
create policy recurring_company_update on public.recurring_meal_plans for update to authenticated using (company_id=private.my_company_id() or private.is_admin()) with check (company_id=private.my_company_id() or private.is_admin());

-- Preserve the existing operations login during the V5 rollout.
-- The account already existed before customer/provider registration was introduced.
update public.user_profiles set role='admin'
where id in (select id from auth.users where lower(email)='support@gulfcateringhub.com');

-- Guard profile role: only an admin may alter roles.
create or replace function private.guard_profile_update()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  new.id := old.id;
  new.created_at := old.created_at;
  if private.is_admin() then return new; end if;
  if old.id is distinct from auth.uid() then raise exception 'not profile owner'; end if;
  new.id := old.id;
  new.role := old.role;
  return new;
end; $$;
drop trigger if exists guard_profile_update_trg on public.user_profiles;
create trigger guard_profile_update_trg before update on public.user_profiles for each row execute procedure private.guard_profile_update();

-- Provider cannot self-approve or change ownership.
create or replace function private.guard_provider_insert()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if private.is_admin() then return new; end if;
  if private.my_role() is distinct from 'provider' or new.owner_user_id is distinct from auth.uid() then raise exception 'not provider account'; end if;
  new.status := 'pending';
  return new;
end; $$;
drop trigger if exists guard_provider_insert_trg on public.catering_providers;
create trigger guard_provider_insert_trg before insert on public.catering_providers for each row execute procedure private.guard_provider_insert();

create or replace function private.guard_provider_update()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  new.id := old.id;
  new.created_at := old.created_at;
  if private.is_admin() then return new; end if;
  if old.owner_user_id is distinct from auth.uid() or private.my_role() is distinct from 'provider' then raise exception 'not provider owner'; end if;
  new.owner_user_id := old.owner_user_id;
  new.status := old.status;
  return new;
end; $$;
drop trigger if exists guard_provider_update_trg on public.catering_providers;
create trigger guard_provider_update_trg before update on public.catering_providers for each row execute procedure private.guard_provider_update();

-- Package insert/update workflow cannot be bypassed from the browser/API.
create or replace function private.guard_package_insert()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if private.is_admin() then return new; end if;
  if private.my_role() is distinct from 'provider' or new.provider_id<>private.my_provider_id() then raise exception 'not package owner'; end if;
  new.active := false;
  new.review_status := 'draft';
  return new;
end; $$;
drop trigger if exists guard_package_insert_trg on public.catering_packages;
create trigger guard_package_insert_trg before insert on public.catering_packages for each row execute procedure private.guard_package_insert();

create or replace function private.guard_package_update()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  new.id := old.id;
  new.created_at := old.created_at;
  if private.is_admin() then return new; end if;
  if old.provider_id is distinct from private.my_provider_id() or private.my_role() is distinct from 'provider' then raise exception 'not package owner'; end if;
  if old.review_status='pending_review' then raise exception 'package is under review'; end if;
  new.provider_id := old.provider_id;
  new.active := false;
  if old.review_status='approved' or old.active=true then
    new.review_status := 'pending_review';
  elsif new.review_status not in ('draft','pending_review') then
    new.review_status := old.review_status;
  end if;
  return new;
end; $$;
drop trigger if exists guard_package_update_trg on public.catering_packages;
create trigger guard_package_update_trg before update on public.catering_packages for each row execute procedure private.guard_package_update();

-- Company cannot change ownership.
create or replace function private.guard_company_update()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  new.id := old.id;
  new.created_at := old.created_at;
  if private.is_admin() then return new; end if;
  if old.owner_user_id is distinct from auth.uid() or private.my_role() is distinct from 'company' then raise exception 'not company owner'; end if;
  new.owner_user_id := old.owner_user_id;
  return new;
end; $$;
drop trigger if exists guard_company_update_trg on public.companies;
create trigger guard_company_update_trg before update on public.companies for each row execute procedure private.guard_company_update();

-- Validate branch/package references and force safe initial order state.
create or replace function private.guard_company_order_insert()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if private.is_admin() then return new; end if;
  if private.my_role() is distinct from 'company' or new.company_id is distinct from private.my_company_id() then raise exception 'not company account'; end if;
  if new.branch_id is not null and not exists(select 1 from public.company_branches b where b.id=new.branch_id and b.company_id=new.company_id) then
    raise exception 'branch does not belong to company';
  end if;
  if new.package_id is not null and not exists(
    select 1 from public.catering_packages p join public.catering_providers cp on cp.id=p.provider_id
    where p.id=new.package_id and p.active=true and p.review_status='approved' and cp.status='approved'
  ) then raise exception 'package is not available'; end if;
  new.provider_id := null;
  new.status := 'pending_approval';
  new.requested_by := auth.uid();
  new.approved_by := null;
  new.approved_at := null;
  new.assigned_at := null;
  new.provider_responded_at := null;
  new.completed_at := null;
  return new;
end; $$;
drop trigger if exists guard_company_order_insert_trg on public.company_orders;
create trigger guard_company_order_insert_trg before insert on public.company_orders for each row execute procedure private.guard_company_order_insert();

create or replace function private.guard_company_order_update()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare mine_company uuid; mine_provider uuid;
begin
  new.id := old.id;
  new.created_at := old.created_at;
  if private.is_admin() then return new; end if;
  mine_company := private.my_company_id();
  mine_provider := private.my_provider_id();

  if old.company_id = mine_company and private.my_role()='company' then
    new.company_id := old.company_id;
    new.provider_id := old.provider_id;
    new.assigned_at := old.assigned_at;
    new.provider_responded_at := old.provider_responded_at;
    new.completed_at := old.completed_at;
    new.requested_by := old.requested_by;

    if old.status='pending_approval' then
      if new.status not in ('pending_approval','approved','cancelled') then raise exception 'invalid company order transition'; end if;
      if new.branch_id is not null and not exists(select 1 from public.company_branches b where b.id=new.branch_id and b.company_id=old.company_id) then
        raise exception 'branch does not belong to company';
      end if;
      if new.package_id is not null and not exists(
        select 1 from public.catering_packages p join public.catering_providers cp on cp.id=p.provider_id
        where p.id=new.package_id and p.active=true and p.review_status='approved' and cp.status='approved'
      ) then raise exception 'package is not available'; end if;
      if new.status='approved' then new.approved_by:=auth.uid(); new.approved_at:=now();
      elsif new.status='pending_approval' then new.approved_by:=null; new.approved_at:=null;
      end if;
      return new;
    end if;

    -- Once approved, company data is frozen; cancellation is allowed only before provider assignment.
    new.branch_id := old.branch_id;
    new.package_id := old.package_id;
    new.order_type := old.order_type;
    new.event_date := old.event_date;
    new.people_count := old.people_count;
    new.estimated_total := old.estimated_total;
    new.details := old.details;
    new.approved_by := old.approved_by;
    new.approved_at := old.approved_at;
    if old.status='approved' and new.status in ('approved','cancelled') then return new; end if;
    new.status := old.status;
    return new;
  end if;

  if old.provider_id = mine_provider and private.my_role()='provider' then
    new.company_id := old.company_id;
    new.branch_id := old.branch_id;
    new.package_id := old.package_id;
    new.provider_id := old.provider_id;
    new.order_type := old.order_type;
    new.event_date := old.event_date;
    new.people_count := old.people_count;
    new.estimated_total := old.estimated_total;
    new.details := old.details;
    new.requested_by := old.requested_by;
    new.approved_by := old.approved_by;
    new.approved_at := old.approved_at;
    new.assigned_at := old.assigned_at;
    if old.status='sent_to_provider' and new.status in ('provider_accepted','provider_rejected') then
      new.provider_responded_at := now();
      new.completed_at := old.completed_at;
      return new;
    elsif old.status='provider_accepted' and new.status='completed' then
      new.provider_responded_at := old.provider_responded_at;
      new.completed_at := now();
      return new;
    elsif new.status=old.status then
      new.provider_responded_at := old.provider_responded_at;
      new.completed_at := old.completed_at;
      return new;
    end if;
    raise exception 'invalid provider order transition';
  end if;

  raise exception 'not allowed to update this order';
end; $$;
drop trigger if exists guard_company_order_update_trg on public.company_orders;
create trigger guard_company_order_update_trg before update on public.company_orders for each row execute procedure private.guard_company_order_update();

-- Recurring plans always start pending. Company may edit pending plans or cancel; admin controls activation.
create or replace function private.guard_recurring_insert()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if private.is_admin() then return new; end if;
  if private.my_role() is distinct from 'company' or new.company_id is distinct from private.my_company_id() then raise exception 'not company account'; end if;
  if new.branch_id is not null and not exists(select 1 from public.company_branches b where b.id=new.branch_id and b.company_id=new.company_id) then
    raise exception 'branch does not belong to company';
  end if;
  new.status := 'pending';
  return new;
end; $$;
drop trigger if exists guard_recurring_insert_trg on public.recurring_meal_plans;
create trigger guard_recurring_insert_trg before insert on public.recurring_meal_plans for each row execute procedure private.guard_recurring_insert();

create or replace function private.guard_recurring_update()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  new.id := old.id;
  new.created_at := old.created_at;
  if private.is_admin() then return new; end if;
  if old.company_id is distinct from private.my_company_id() or private.my_role() is distinct from 'company' then raise exception 'not company owner'; end if;
  new.company_id := old.company_id;
  if new.branch_id is not null and not exists(select 1 from public.company_branches b where b.id=new.branch_id and b.company_id=new.company_id) then raise exception 'branch does not belong to company'; end if;
  if old.status='pending' then
    if new.status not in ('pending','cancelled') then raise exception 'company cannot activate meal plan'; end if;
    return new;
  end if;
  -- Active/paused plans are managed by operations; company may only cancel them without rewriting terms.
  new.branch_id:=old.branch_id; new.employees:=old.employees; new.days_per_week:=old.days_per_week;
  new.price_per_employee:=old.price_per_employee; new.preferences:=old.preferences;
  if new.status='cancelled' then return new; end if;
  new.status:=old.status;
  return new;
end; $$;
drop trigger if exists guard_recurring_update_trg on public.recurring_meal_plans;
create trigger guard_recurring_update_trg before update on public.recurring_meal_plans for each row execute procedure private.guard_recurring_update();


-- Explicit Data API grants; RLS still limits every row.
revoke all on public.user_profiles, public.companies, public.company_branches,
 public.catering_providers, public.catering_packages, public.company_orders,
 public.recurring_meal_plans from anon, authenticated;
grant select, update on public.user_profiles to authenticated;
grant select, insert, update on public.companies, public.company_branches,
 public.catering_providers, public.catering_packages, public.company_orders,
 public.recurring_meal_plans to authenticated;
grant select on public.catering_providers, public.catering_packages to anon;
grant all on public.user_profiles, public.companies, public.company_branches,
 public.catering_providers, public.catering_packages, public.company_orders,
 public.recurring_meal_plans to service_role;
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_admin(), private.my_role(), private.my_company_id(), private.my_provider_id() to anon, authenticated;

-- New portals must never inherit the legacy public read/write policies.
drop policy if exists "authenticated can delete requests" on public.requests;
drop policy if exists "authenticated can update requests" on public.requests;
drop policy if exists "authenticated can read requests" on public.requests;
drop policy if exists "public can insert requests" on public.requests;
drop policy if exists "Admin only select policy" on public.requests;
drop policy if exists "Secure public insert policy" on public.requests;
drop policy if exists "allow delete" on public.requests;
drop policy if exists "allow update" on public.requests;
drop policy if exists "allow select" on public.requests;
drop policy if exists "allow insert" on public.requests;

alter table public.requests enable row level security;
revoke all on public.requests from anon, authenticated;
grant insert on public.requests to anon, authenticated;
grant select, update, delete on public.requests to authenticated;
grant usage on sequence public.requests_id_seq to anon, authenticated;
create policy requests_public_submit on public.requests for insert to anon, authenticated
 with check (length(trim(name)) between 1 and 200 and length(trim(phone)) between 5 and 40
 and status='جديد' and length(coalesce(details,''))<=10000);
create policy requests_admin_read on public.requests for select to authenticated using ((select private.is_admin()));
create policy requests_admin_update on public.requests for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy requests_admin_delete on public.requests for delete to authenticated using ((select private.is_admin()));
create index if not exists company_branches_company_idx on public.company_branches(company_id);
create index if not exists recurring_plans_company_idx on public.recurring_meal_plans(company_id);

-- Keep administrative assignment consistent even if called outside the UI.
create or replace function private.validate_order_assignment()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
 if new.status='sent_to_provider' and (new.provider_id is distinct from old.provider_id or new.status is distinct from old.status) then
   if old.status not in ('approved','provider_rejected') then raise exception 'order must be approved before assignment'; end if;
   if not exists(select 1 from public.catering_providers where id=new.provider_id and status='approved') then raise exception 'provider must be approved'; end if;
   new.assigned_at:=now(); new.provider_responded_at:=null; new.completed_at:=null;
 end if;
 return new;
end; $$;
create trigger validate_order_assignment_trg before update on public.company_orders for each row execute function private.validate_order_assignment();
revoke all on function private.validate_order_assignment() from public, anon, authenticated;
notify pgrst, 'reload schema';

-- Existing platform event trigger must not be callable from the Data API.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- Guard supplier approval and package publication even when API clients bypass the UI.
create or replace function private.guard_catering_provider_update()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
 if private.is_admin() then return new; end if;
 if auth.uid() is distinct from old.owner_user_id or private.my_role() is distinct from 'provider' then raise exception 'not provider owner'; end if;
 if new.id is distinct from old.id or new.owner_user_id is distinct from old.owner_user_id or new.status is distinct from old.status or new.created_at is distinct from old.created_at then raise exception 'provider protected fields cannot be changed'; end if;
 return new;
end; $$;
drop trigger if exists guard_catering_provider_update_trg on public.catering_providers;
create trigger guard_catering_provider_update_trg before update on public.catering_providers for each row execute function private.guard_catering_provider_update();
create or replace function private.guard_catering_package_update()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
 if private.is_admin() then return new; end if;
 if private.my_role() is distinct from 'provider' or old.provider_id is distinct from private.my_provider_id() then raise exception 'not package owner'; end if;
 if new.id is distinct from old.id or new.provider_id is distinct from old.provider_id or new.created_at is distinct from old.created_at then raise exception 'package ownership cannot be changed'; end if;
 if old.review_status is distinct from 'draft' or old.active is distinct from false then raise exception 'submitted packages can only be changed by administration'; end if;
 if new.active is distinct from false or new.review_status not in ('draft','pending_review') then raise exception 'provider cannot approve or activate a package'; end if;
 return new;
end; $$;
drop trigger if exists guard_catering_package_update_trg on public.catering_packages;
create trigger guard_catering_package_update_trg before update on public.catering_packages for each row execute function private.guard_catering_package_update();
revoke all on function private.guard_catering_provider_update(),private.guard_catering_package_update() from public,anon,authenticated;

-- Indexes for high-volume company ordering and supplier lookup.
create index if not exists companies_preferred_provider_idx on public.companies(preferred_provider_id);
create index if not exists company_orders_approved_by_idx on public.company_orders(approved_by);
create index if not exists company_orders_branch_idx on public.company_orders(branch_id);
create index if not exists company_orders_package_idx on public.company_orders(package_id);
create index if not exists company_orders_requested_by_idx on public.company_orders(requested_by);
create index if not exists recurring_meal_plans_branch_idx on public.recurring_meal_plans(branch_id);

-- Verified suppliers publish and pause packages immediately; initial supplier verification remains mandatory.
drop trigger if exists guard_catering_package_update_trg on public.catering_packages;
drop function if exists private.guard_catering_package_update();
create or replace function private.guard_package_insert()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if private.is_admin() then return new; end if;
 if private.my_role() is distinct from 'provider' or new.provider_id is distinct from private.my_provider_id() then raise exception 'not package owner'; end if;
 if exists(select 1 from public.catering_providers p where p.id=new.provider_id and p.status='approved') then new.active:=true;new.review_status:='approved';
 else new.active:=false;new.review_status:='draft';end if;
 return new;
end; $$;
create or replace function private.guard_package_update()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare provider_approved boolean;
begin
 new.id:=old.id;new.created_at:=old.created_at;
 if private.is_admin() then return new; end if;
 if old.provider_id is distinct from private.my_provider_id() or private.my_role() is distinct from 'provider' then raise exception 'not package owner'; end if;
 new.provider_id:=old.provider_id;
 select (p.status='approved') into provider_approved from public.catering_providers p where p.id=old.provider_id;
 if coalesce(provider_approved,false) then new.review_status:='approved';new.active:=coalesce(new.active,false);
 else new.review_status:='draft';new.active:=false;end if;
 return new;
end; $$;
drop policy if exists packages_provider_insert on public.catering_packages;
create policy packages_provider_insert on public.catering_packages for insert to authenticated with check (
 private.is_admin() or (private.my_role()='provider' and provider_id=private.my_provider_id()
 and ((active=true and review_status='approved' and exists(select 1 from public.catering_providers p where p.id=provider_id and p.status='approved')) or (active=false and review_status='draft')))
);
