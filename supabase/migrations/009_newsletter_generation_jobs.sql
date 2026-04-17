do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'newsletter_generation_job_status'
  ) then
    create type newsletter_generation_job_status as enum ('queued', 'running', 'completed', 'failed');
  end if;
end $$;

create table if not exists newsletter_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  draft_id uuid references newsletters(id) on delete set null,
  external_thread_id text,
  callback_url text,
  status newsletter_generation_job_status not null default 'queued',
  request_payload jsonb not null default '{}'::jsonb,
  draft_document jsonb not null default '{}'::jsonb,
  quick_notes text not null default '',
  uploaded_assets jsonb not null default '[]'::jsonb,
  result jsonb,
  persisted_document jsonb,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  attempt_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists newsletter_generation_jobs_school_idx
  on newsletter_generation_jobs (school_id, created_at desc);

create index if not exists newsletter_generation_jobs_status_idx
  on newsletter_generation_jobs (status, updated_at desc);

comment on table newsletter_generation_jobs is 'Durable newsletter writing jobs for builder and inbound school webhook conversations.';
