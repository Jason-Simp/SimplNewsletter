alter table schools
add column if not exists support_modules jsonb not null default '[]'::jsonb;

comment on column schools.support_modules is 'Optional per-school support modules used to fill light newsletter layouts with trusted evergreen cards.';
