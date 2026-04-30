do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'user_role'
      and e.enumlabel = 'company_admin'
  ) then
    alter type user_role add value 'company_admin';
  end if;
end
$$;

create or replace function public.current_member_school_ids()
returns setof uuid
language plpgsql
security definer
stable
as $$
begin
  if exists (
    select 1
    from school_users
    where auth_user_id = auth.uid()
      and is_active = true
      and role = 'company_admin'
  ) then
    return query
    select id
    from schools;
    return;
  end if;

  return query
  select school_id
  from school_users
  where auth_user_id = auth.uid()
    and is_active = true;
end;
$$;

create or replace function public.is_current_member_school_admin(target_school_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from school_users
    where auth_user_id = auth.uid()
      and is_active = true
      and (
        role = 'company_admin'
        or (school_id = target_school_id and role = 'school_admin')
      )
  );
$$;
