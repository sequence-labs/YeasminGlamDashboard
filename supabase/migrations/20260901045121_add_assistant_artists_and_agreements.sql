create table if not exists public.assistant_artists (
  id serial primary key,
  name text not null,
  role text not null default 'Makeup Artist',
  email text,
  phone text,
  payment_method text,
  notes text,
  active boolean not null default true,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists public.assistant_agreements (
  id serial primary key,
  assistant_artist_id integer not null references public.assistant_artists(id) on delete restrict,
  event_name text not null default 'Wedding / Event',
  event_date text,
  location text,
  arrival_time text,
  minimum_clients integer not null default 2 check (minimum_clients >= 0),
  maximum_clients integer not null default 3 check (maximum_clients >= minimum_clients),
  per_client_rate numeric(10, 2) not null default 90 check (per_client_rate >= 0),
  booking_deposit numeric(10, 2) not null default 100 check (booking_deposit >= 0),
  payment_method text,
  payment_timing text,
  special_notes text,
  status text not null default 'draft' check (status in ('draft', 'confirmed', 'completed', 'cancelled')),
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create index if not exists assistant_agreements_assistant_artist_id_idx
  on public.assistant_agreements (assistant_artist_id);

create index if not exists assistant_agreements_event_date_idx
  on public.assistant_agreements (event_date);

alter table public.assistant_artists enable row level security;
alter table public.assistant_agreements enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on table public.assistant_artists from anon';
    execute 'revoke all on table public.assistant_agreements from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on table public.assistant_artists from authenticated';
    execute 'revoke all on table public.assistant_agreements from authenticated';
  end if;
end
$$;
