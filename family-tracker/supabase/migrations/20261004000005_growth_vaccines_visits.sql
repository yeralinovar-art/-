-- Этап 2.3: рост и вес ребёнка, прививки, визиты к врачу и анализы.
--
-- Доступ:
--   * рост/вес и прививки ребёнка — общие для семьи;
--   * визиты взрослого (приёмы, УЗИ, анализы) — только владелец (owner_id);
--   * визиты ребёнка — оба родителя.

create table public.child_growth (
  id           uuid primary key default gen_random_uuid(),
  child_id     uuid not null references public.children (id) on delete cascade,
  measured_on  date not null,
  height_cm    numeric(5, 1) check (height_cm between 30 and 200),
  weight_kg    numeric(5, 2) check (weight_kg between 1 and 120),
  note         text check (char_length(note) <= 200),
  created_by   uuid default auth.uid() references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  check (height_cm is not null or weight_kg is not null),
  unique (child_id, measured_on)
);

create table public.child_vaccines (
  id           uuid primary key default gen_random_uuid(),
  child_id     uuid not null references public.children (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 80),
  planned_on   date,
  given_on     date,
  note         text check (char_length(note) <= 200),
  created_by   uuid default auth.uid() references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  check (planned_on is not null or given_on is not null)
);

create index child_vaccines_child_idx on public.child_vaccines (child_id);

create table public.medical_visits (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null default public.my_family_id() references public.families (id) on delete cascade,
  owner_id    uuid references auth.users (id) on delete cascade,
  child_id    uuid references public.children (id) on delete cascade,
  kind        text not null default 'doctor' check (kind in ('doctor', 'ultrasound', 'tests', 'other')),
  title       text not null check (char_length(title) between 1 and 100),
  visit_date  date not null,
  visit_time  text check (visit_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  place       text check (char_length(place) <= 120),
  questions   text check (char_length(questions) <= 2000),
  result      text check (char_length(result) <= 4000),
  done        boolean not null default false,
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  check ((owner_id is null) <> (child_id is null))
);

create index medical_visits_family_date_idx on public.medical_visits (family_id, visit_date);

alter table public.child_growth enable row level security;
alter table public.child_vaccines enable row level security;
alter table public.medical_visits enable row level security;

-- Данные ребёнка доступны, если доступен сам ребёнок (RLS на children — по семье).
create policy "child_growth: семья" on public.child_growth
  for all to authenticated
  using (exists (select 1 from public.children c where c.id = child_id))
  with check (exists (select 1 from public.children c where c.id = child_id));

create policy "child_vaccines: семья" on public.child_vaccines
  for all to authenticated
  using (exists (select 1 from public.children c where c.id = child_id))
  with check (exists (select 1 from public.children c where c.id = child_id));

create policy "medical_visits: свои и детские" on public.medical_visits
  for all to authenticated
  using (
    family_id = public.my_family_id()
    and (owner_id = auth.uid() or child_id is not null)
  )
  with check (
    family_id = public.my_family_id()
    and (
      owner_id = auth.uid()
      or exists (select 1 from public.children c where c.id = child_id and c.family_id = public.my_family_id())
    )
  );

revoke all on public.child_growth, public.child_vaccines, public.medical_visits from anon;
