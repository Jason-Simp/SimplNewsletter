-- Production security hardening: keep all application data behind server-side
-- authorization, make signup-code redemption atomic, and make job claims safe.

update public.signup_codes
set is_active = false
where lower(code) = 'thewire'
  and description = 'Default launch signup code';

create or replace function public.consume_signup_code(input_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  consumed_id uuid;
begin
  update public.signup_codes
  set use_count = use_count + 1
  where lower(code) = lower(trim(input_code))
    and is_active = true
    and (expires_at is null or expires_at > now())
    and (max_uses is null or use_count < max_uses)
  returning id into consumed_id;

  if consumed_id is null then
    raise exception 'signup code unavailable' using errcode = 'P0001';
  end if;

  return consumed_id;
end;
$$;

create or replace function public.current_member_school_ids()
returns setof uuid
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.school_users
    where auth_user_id = auth.uid() and is_active = true and role = 'company_admin'
  ) then
    return query select id from public.schools;
    return;
  end if;

  return query
  select school_id from public.school_users
  where auth_user_id = auth.uid() and is_active = true;
end;
$$;

create or replace function public.is_current_member_school_admin(target_school_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.school_users
    where auth_user_id = auth.uid()
      and is_active = true
      and (role = 'company_admin' or (school_id = target_school_id and role = 'school_admin'))
  );
$$;

create or replace function public.claim_newsletter_generation_job(input_job_id uuid)
returns setof public.newsletter_generation_jobs
language sql
security definer
set search_path = ''
as $$
  update public.newsletter_generation_jobs
  set status = 'running',
      error = null,
      started_at = now(),
      attempt_count = attempt_count + 1,
      updated_at = now()
  where id = input_job_id
    and attempt_count < 3
    and (
      status = 'queued'
      or (status = 'running' and started_at < now() - interval '15 minutes')
    )
  returning *;
$$;

alter table public.newsletter_generation_jobs enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

revoke all on function public.consume_signup_code(text) from public, anon, authenticated;
revoke all on function public.claim_newsletter_generation_job(uuid) from public, anon, authenticated;
revoke all on function public.current_member_school_ids() from public, anon, authenticated;
revoke all on function public.is_current_member_school_admin(uuid) from public, anon, authenticated;
grant execute on function public.consume_signup_code(text) to service_role;
grant execute on function public.claim_newsletter_generation_job(uuid) to service_role;
grant execute on function public.current_member_school_ids() to service_role;
grant execute on function public.is_current_member_school_admin(uuid) to service_role;

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'alter function public.rls_auto_enable() set search_path = pg_catalog, public';
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
    execute 'grant execute on function public.rls_auto_enable() to service_role';
  end if;
end
$$;

create index if not exists school_users_auth_user_idx on public.school_users(auth_user_id);
create index if not exists newsletters_created_by_idx on public.newsletters(created_by);
create index if not exists newsletters_updated_by_idx on public.newsletters(updated_by);
create index if not exists assets_newsletter_id_idx on public.assets(newsletter_id);
create index if not exists newsletter_sections_newsletter_id_idx on public.newsletter_sections(newsletter_id);
create index if not exists distribution_targets_newsletter_id_idx on public.newsletter_distribution_targets(newsletter_id);
create index if not exists distribution_jobs_newsletter_id_idx on public.distribution_jobs(newsletter_id);
create index if not exists vector_queue_school_newsletter_idx on public.vector_content_queue(school_id, newsletter_id);
create index if not exists generation_jobs_external_thread_idx
  on public.newsletter_generation_jobs(school_id, external_thread_id)
  where external_thread_id is not null;

update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array[
      'image/png', 'image/jpeg', 'image/gif', 'image/webp',
      'audio/mpeg', 'audio/mp4', 'audio/wav',
      'video/mp4', 'video/quicktime', 'video/webm',
      'application/pdf'
    ]::text[]
where id = 'newsletter-assets';

do $$
begin
  if exists (select 1 from pg_extension where extname = 'vector')
     and exists (select 1 from pg_namespace where nspname = 'extensions') then
    alter extension vector set schema extensions;
  end if;
end
$$;
