create table if not exists public.service_menu_content (
  key text primary key,
  schema_version integer not null default 1,
  content jsonb not null,
  revision integer not null default 1,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now(),
  constraint service_menu_content_singleton_key check (key = 'bridal-services'),
  constraint service_menu_content_schema_version_positive check (schema_version >= 1),
  constraint service_menu_content_revision_positive check (revision >= 1),
  constraint service_menu_content_document_object check (jsonb_typeof(content) = 'object')
);

alter table public.service_menu_content enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on table public.service_menu_content from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on table public.service_menu_content from authenticated';
  end if;
end
$$;
