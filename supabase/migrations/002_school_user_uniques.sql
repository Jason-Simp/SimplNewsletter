create unique index if not exists school_users_school_email_idx on school_users (school_id, email);
create index if not exists school_users_email_idx on school_users (email);
