-- Этап 2.2: дети и витамины/лекарства по расписанию с отметкой приёма.
--
-- Доступ:
--   * дети — общие для семьи (видят и правят оба родителя);
--   * лекарства взрослого — только владелец (owner_id);
--   * лекарства ребёнка — оба родителя, отметить «дал(а)» может любой;
--   * отметки приёма видны тем, кому видно само лекарство.

-- Проверка списка времени приёма: каждый элемент 'ЧЧ:ММ' в пределах суток.
create or replace function public.valid_times(times text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(bool_and(t ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'), false) from unnest(times) t
$$;

create table public.children (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null default public.my_family_id() references public.families (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 40),
  birth_date  date,
  sex         text check (sex in ('female', 'male')),
  created_at  timestamptz not null default now()
);

create index children_family_id_idx on public.children (family_id);

create table public.medications (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null default public.my_family_id() references public.families (id) on delete cascade,
  owner_id    uuid references auth.users (id) on delete cascade,
  child_id    uuid references public.children (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  dose        text check (char_length(dose) <= 60),
  -- Время приёма по Алматы, 'ЧЧ:ММ'.
  times       text[] not null default '{08:00}'
              check (cardinality(times) between 1 and 6 and public.valid_times(times)),
  -- Дни недели ISO (1 = пн … 7 = вс); пусто — каждый день.
  weekdays    int[] check (weekdays is null or (cardinality(weekdays) between 1 and 7 and weekdays <@ array[1, 2, 3, 4, 5, 6, 7])),
  note        text check (char_length(note) <= 200),
  start_date  date not null default current_date,
  end_date    date,
  archived    boolean not null default false,
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  -- Ровно одно: лекарство взрослого или ребёнка.
  check ((owner_id is null) <> (child_id is null)),
  check (end_date is null or end_date >= start_date)
);

create index medications_family_id_idx on public.medications (family_id);

create table public.medication_doses (
  id             uuid primary key default gen_random_uuid(),
  medication_id  uuid not null references public.medications (id) on delete cascade,
  dose_date      date not null,
  slot           text not null check (slot ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  taken_at       timestamptz not null default now(),
  taken_by       uuid default auth.uid() references auth.users (id) on delete set null,
  unique (medication_id, dose_date, slot)
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.children enable row level security;
alter table public.medications enable row level security;
alter table public.medication_doses enable row level security;

create policy "children: семья" on public.children
  for all to authenticated
  using (family_id = public.my_family_id())
  with check (family_id = public.my_family_id());

create policy "medications: свои и детские" on public.medications
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

-- Подзапрос к medications сам проходит через RLS: отметка видна, только если видно лекарство.
create policy "medication_doses: по лекарству" on public.medication_doses
  for select to authenticated
  using (exists (select 1 from public.medications m where m.id = medication_id));

create policy "medication_doses: отмечаю" on public.medication_doses
  for insert to authenticated
  with check (taken_by = auth.uid() and exists (select 1 from public.medications m where m.id = medication_id));

create policy "medication_doses: снимаю отметку" on public.medication_doses
  for delete to authenticated
  using (exists (select 1 from public.medications m where m.id = medication_id));

revoke all on public.children, public.medications, public.medication_doses from anon;
