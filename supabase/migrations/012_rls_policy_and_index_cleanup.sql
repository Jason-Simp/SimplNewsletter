create index if not exists assets_school_id_idx on public.assets(school_id);
create index if not exists generation_jobs_draft_id_idx on public.newsletter_generation_jobs(draft_id);
create index if not exists vector_queue_newsletter_id_idx on public.vector_content_queue(newsletter_id);

alter policy "members can view own member records" on public.school_users
  to authenticated
  using (auth_user_id = (select auth.uid()) or school_id in (select public.current_member_school_ids()));

drop policy if exists "school admins can manage member records" on public.school_users;
create policy "school admins can insert member records" on public.school_users
  for insert to authenticated with check (public.is_current_member_school_admin(school_id));
create policy "school admins can update member records" on public.school_users
  for update to authenticated using (public.is_current_member_school_admin(school_id))
  with check (public.is_current_member_school_admin(school_id));
create policy "school admins can delete member records" on public.school_users
  for delete to authenticated using (public.is_current_member_school_admin(school_id));

alter policy "members can view newsletters for assigned schools" on public.newsletters to authenticated;
drop policy if exists "members can manage newsletters for assigned schools" on public.newsletters;
create policy "members can insert newsletters for assigned schools" on public.newsletters
  for insert to authenticated with check (school_id in (select public.current_member_school_ids()));
create policy "members can update newsletters for assigned schools" on public.newsletters
  for update to authenticated using (school_id in (select public.current_member_school_ids()))
  with check (school_id in (select public.current_member_school_ids()));
create policy "members can delete newsletters for assigned schools" on public.newsletters
  for delete to authenticated using (school_id in (select public.current_member_school_ids()));
