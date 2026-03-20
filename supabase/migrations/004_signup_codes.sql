create table if not exists signup_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  is_active boolean not null default true,
  max_uses integer,
  use_count integer not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

insert into signup_codes (code, description, is_active, max_uses, use_count)
values ('thewire', 'Default launch signup code', true, null, 0)
on conflict (code) do nothing;
