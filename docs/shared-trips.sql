create table if not exists shared_trips (
  slug text primary key,
  start text not null,
  end text not null,
  trip_data jsonb not null,
  created_at timestamptz default now()
);

create index if not exists shared_trips_created_at_idx on shared_trips(created_at desc);
