alter table schools enable row level security;
alter table school_users enable row level security;
alter table newsletters enable row level security;
alter table newsletter_sections enable row level security;
alter table assets enable row level security;
alter table newsletter_distribution_targets enable row level security;
alter table distribution_jobs enable row level security;
alter table vector_content_queue enable row level security;

create or replace function public.current_member_school_ids()
returns setof uuid
language sql
security definer
set search_path = public
as $$
  select school_id
  from school_users
  where auth_user_id = auth.uid()
    and is_active = true
$$;

create or replace function public.is_current_member_school_admin(target_school_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from school_users
    where auth_user_id = auth.uid()
      and school_id = target_school_id
      and role = 'school_admin'
      and is_active = true
  )
$$;

create policy "members can view own schools"
on schools
for select
using (id in (select public.current_member_school_ids()));

create policy "school admins can update own schools"
on schools
for update
using (public.is_current_member_school_admin(id))
with check (public.is_current_member_school_admin(id));

create policy "members can view own member records"
on school_users
for select
using (
  auth_user_id = auth.uid()
  or school_id in (select public.current_member_school_ids())
);

create policy "school admins can manage member records"
on school_users
for all
using (public.is_current_member_school_admin(school_id))
with check (public.is_current_member_school_admin(school_id));

create policy "members can view newsletters for assigned schools"
on newsletters
for select
using (school_id in (select public.current_member_school_ids()));

create policy "members can manage newsletters for assigned schools"
on newsletters
for all
using (school_id in (select public.current_member_school_ids()))
with check (school_id in (select public.current_member_school_ids()));

create policy "members can manage sections for assigned newsletters"
on newsletter_sections
for all
using (
  newsletter_id in (
    select id from newsletters where school_id in (select public.current_member_school_ids())
  )
)
with check (
  newsletter_id in (
    select id from newsletters where school_id in (select public.current_member_school_ids())
  )
);

create policy "members can manage assets for assigned schools"
on assets
for all
using (school_id in (select public.current_member_school_ids()))
with check (school_id in (select public.current_member_school_ids()));

create policy "members can manage distribution targets for assigned newsletters"
on newsletter_distribution_targets
for all
using (
  newsletter_id in (
    select id from newsletters where school_id in (select public.current_member_school_ids())
  )
)
with check (
  newsletter_id in (
    select id from newsletters where school_id in (select public.current_member_school_ids())
  )
);

create policy "members can manage distribution jobs for assigned newsletters"
on distribution_jobs
for all
using (
  newsletter_id in (
    select id from newsletters where school_id in (select public.current_member_school_ids())
  )
)
with check (
  newsletter_id in (
    select id from newsletters where school_id in (select public.current_member_school_ids())
  )
);

create policy "members can manage vector queue for assigned schools"
on vector_content_queue
for all
using (school_id in (select public.current_member_school_ids()))
with check (school_id in (select public.current_member_school_ids()));
