alter table schools
add column if not exists webhook_url text;

alter table schools
add column if not exists webhook_secret text;

comment on column schools.webhook_url is 'Optional per-school webhook URL for downstream delivery such as Monday.com, n8n, Zapier, or internal systems.';
comment on column schools.webhook_secret is 'Optional per-school webhook secret or token used when posting newsletter payloads.';

