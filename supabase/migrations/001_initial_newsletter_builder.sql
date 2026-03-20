create extension if not exists "pgcrypto";
create extension if not exists vector;

create type user_role as enum ('school_admin', 'editor');
create type publish_mode as enum ('instant', 'approval');
create type newsletter_status as enum ('draft', 'published', 'archived');
create type distribution_channel as enum ('web', 'email', 'pdf', 'html', 'blog');
create type distribution_status as enum ('queued', 'running', 'completed', 'failed');
create type asset_kind as enum ('image', 'audio', 'video', 'document');
create type vector_provider as enum ('supabase', 'openai', 'none');

create table if not exists schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tagline text,
  logo_url text,
  website_url text,
  contact_email text,
  phone text,
  address text,
  primary_color text not null default '#123A69',
  secondary_color text not null default '#86201A',
  accent_color text not null default '#E7B55E',
  background_color text not null default '#F7F9FC',
  surface_color text not null default '#FFFFFF',
  text_color text not null default '#142033',
  muted_text_color text not null default '#5B667A',
  publish_mode publish_mode not null default 'instant',
  archive_days integer not null default 30,
  users_managed_by_school boolean not null default true,
  vector_provider vector_provider not null default 'none',
  encrypted_project_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists school_users (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  auth_user_id uuid,
  email text not null,
  full_name text,
  role user_role not null default 'editor',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists newsletters (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  title text not null,
  slug text not null,
  issue_date date,
  audience text,
  intro text,
  subject_line text,
  preview_text text,
  status newsletter_status not null default 'draft',
  created_by uuid references school_users(id),
  updated_by uuid references school_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create unique index if not exists newsletters_school_slug_idx on newsletters (school_id, slug);

create table if not exists newsletter_sections (
  id uuid primary key default gen_random_uuid(),
  newsletter_id uuid not null references newsletters(id) on delete cascade,
  section_type text not null,
  title text not null,
  enabled boolean not null default true,
  sort_order integer not null,
  layout_variant text,
  visibility jsonb not null default '{"web": true, "email": true, "pdf": true, "html": true, "blog": true}'::jsonb,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  newsletter_id uuid references newsletters(id) on delete cascade,
  kind asset_kind not null,
  original_filename text not null,
  mime_type text not null,
  storage_path text not null,
  public_url text,
  original_size_bytes bigint not null,
  processed_size_bytes bigint,
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists newsletter_distribution_targets (
  id uuid primary key default gen_random_uuid(),
  newsletter_id uuid not null references newsletters(id) on delete cascade,
  channel distribution_channel not null,
  selected boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (newsletter_id, channel)
);

create table if not exists distribution_jobs (
  id uuid primary key default gen_random_uuid(),
  newsletter_id uuid not null references newsletters(id) on delete cascade,
  channel distribution_channel not null,
  status distribution_status not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists vector_content_queue (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  newsletter_id uuid references newsletters(id) on delete set null,
  source_type text not null,
  source_ref text,
  content jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists assets_expiration_idx on assets (expires_at);
create index if not exists vector_content_queue_status_idx on vector_content_queue (status, created_at);

comment on table vector_content_queue is 'Queue of school-specific content to push into the configured vector store provider.';
