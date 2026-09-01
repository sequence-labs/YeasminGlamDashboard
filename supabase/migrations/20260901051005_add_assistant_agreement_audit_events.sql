create table if not exists public.assistant_agreement_audit_events (
  id serial primary key,
  agreement_id integer not null,
  assistant_artist_id integer not null,
  action text not null check (action in ('created', 'updated', 'status_changed', 'assistant_profile_updated')),
  actor_type text not null default 'artist',
  summary text not null,
  changes jsonb not null default '{}'::jsonb,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamp not null default now()
);

create index if not exists assistant_agreement_audit_events_agreement_id_created_at_idx
  on public.assistant_agreement_audit_events (agreement_id, created_at desc);

alter table public.assistant_agreement_audit_events enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on table public.assistant_agreement_audit_events from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on table public.assistant_agreement_audit_events from authenticated';
  end if;
end
$$;

-- The event trail is write-once. The application only inserts audit rows, and this
-- trigger prevents an accidental server-side UPDATE or DELETE from rewriting history.
create or replace function public.prevent_assistant_agreement_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'assistant agreement audit events are append-only';
end;
$$;

drop trigger if exists assistant_agreement_audit_events_immutable on public.assistant_agreement_audit_events;
create trigger assistant_agreement_audit_events_immutable
before update or delete on public.assistant_agreement_audit_events
for each row execute function public.prevent_assistant_agreement_audit_mutation();
