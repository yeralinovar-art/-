-- Этап 4.2: проекты (работа/хобби), учёт времени с таймером, чтение. Всё личное.

-- ---------------------------------------------------------------------------
-- Проекты и время
-- ---------------------------------------------------------------------------

create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  kind        text not null default 'work' check (kind in ('work', 'hobby')),
  -- Номер цвета из проверенной палитры графиков (1–8), а не произвольный hex.
  color_slot  smallint not null default 1 check (color_slot between 1 and 8),
  archived    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index projects_user_idx on public.projects (user_id);

create table public.time_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id  uuid not null references public.projects (id) on delete cascade,
  started_at  timestamptz not null,
  -- null — таймер идёт.
  ended_at    timestamptz,
  note        text check (char_length(note) <= 200),
  created_at  timestamptz not null default now(),
  check (ended_at is null or (ended_at > started_at and ended_at <= started_at + interval '24 hours'))
);

create index time_entries_user_started_idx on public.time_entries (user_id, started_at);
-- Один запущенный таймер на человека.
create unique index time_entries_one_running on public.time_entries (user_id) where ended_at is null;

-- Задача может относиться к своему проекту (только личная).
alter table public.tasks add column project_id uuid references public.projects (id) on delete set null;
alter table public.tasks add constraint tasks_project_personal check (not shared or project_id is null);
grant update (project_id) on public.tasks to authenticated;

-- ---------------------------------------------------------------------------
-- Чтение
-- ---------------------------------------------------------------------------

create table public.books (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 150),
  author        text check (char_length(author) <= 100),
  status        text not null default 'reading' check (status in ('reading', 'done', 'want')),
  total_pages   int check (total_pages between 1 and 10000),
  current_page  int not null default 0 check (current_page >= 0),
  finished_on   date,
  created_at    timestamptz not null default now(),
  check (total_pages is null or current_page <= total_pages)
);

create index books_user_idx on public.books (user_id, status);

create table public.reading_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  book_id     uuid references public.books (id) on delete set null,
  read_on     date not null,
  started_at  timestamptz,
  -- null при запущенном таймере; минуты считаются при остановке или вводятся вручную.
  minutes     smallint check (minutes between 1 and 600),
  created_at  timestamptz not null default now(),
  check (minutes is not null or started_at is not null)
);

create index reading_sessions_user_date_idx on public.reading_sessions (user_id, read_on);
create unique index reading_sessions_one_running on public.reading_sessions (user_id) where minutes is null;

-- Дневная цель чтения, минут.
alter table public.profiles add column reading_goal_min smallint not null default 20 check (reading_goal_min between 5 and 240);
grant update (reading_goal_min) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: всё личное
-- ---------------------------------------------------------------------------

alter table public.projects enable row level security;
alter table public.time_entries enable row level security;
alter table public.books enable row level security;
alter table public.reading_sessions enable row level security;

create policy "projects: свои" on public.projects
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "time_entries: свои" on public.time_entries
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));
create policy "books: свои" on public.books
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "reading_sessions: свои" on public.reading_sessions
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (book_id is null or exists (select 1 from public.books b where b.id = book_id and b.user_id = auth.uid()))
  );

-- Проект у задачи — только свой (дополнительное ограничение к политикам задач).
create policy "tasks: проект только свой" on public.tasks
  as restrictive for insert to authenticated
  with check (project_id is null or exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));
create policy "tasks: проект только свой (изменение)" on public.tasks
  as restrictive for update to authenticated
  using (true)
  with check (project_id is null or exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));

revoke all on public.projects, public.time_entries, public.books, public.reading_sessions from anon;
