alter table schools
add column if not exists agent_api text;

comment on column schools.agent_api is 'School-specific ElevenLabs agent API key used for newsletter generation.';
