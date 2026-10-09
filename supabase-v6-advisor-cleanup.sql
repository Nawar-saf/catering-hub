-- Gulf Catering Hub V6 advisor cleanup
-- 2026-10-09

alter table public.user_profiles validate constraint user_profiles_role_chk;

create index if not exists catering_requests_provider_idx on public.catering_requests(provider_id, created_at desc);
create index if not exists recurring_meal_plans_provider_idx on public.recurring_meal_plans(provider_id, created_at desc);

drop policy if exists company_owner_insert on public.companies;
create policy company_owner_insert on public.companies for insert to authenticated
with check ((select private.is_admin()) or ((select private.my_role())='company' and owner_user_id=(select auth.uid())));

drop policy if exists catering_requests_admin_all on public.catering_requests;
drop policy if exists catering_requests_company_read on public.catering_requests;
drop policy if exists catering_requests_select on public.catering_requests;
create policy catering_requests_select on public.catering_requests for select to authenticated
using ((select private.is_admin()) or (company_id is not null and company_id=(select private.my_company_id())));

drop policy if exists catering_requests_admin_insert on public.catering_requests;
create policy catering_requests_admin_insert on public.catering_requests for insert to authenticated
with check ((select private.is_admin()));

drop policy if exists catering_requests_admin_update on public.catering_requests;
create policy catering_requests_admin_update on public.catering_requests for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy if exists request_rate_limits_deny on public.request_rate_limits;
create policy request_rate_limits_deny on public.request_rate_limits for all to anon,authenticated
using (false) with check (false);
