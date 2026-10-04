-- Этап 4.1: задачи (личные и общие), семейные планы, привычки, цели, домашние дела по очереди.
-- Личное видит только владелец; общее (shared / family_id) — оба члена семьи.

-- ---------------------------------------------------------------------------
-- Семейные планы: крупные цели с подзадачами (поездка, покупка, ремонт)
-- ---------------------------------------------------------------------------

create table public.plans (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null default public.my_family_id() references public.families (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 100),
  emoji       text not null default '🎯' check (char_length(emoji) <= 8),
  note        text check (char_length(note) <= 1000),
  target_date date,
  done        boolean not null default false,
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index plans_family_idx on public.plans (family_id);

-- ---------------------------------------------------------------------------
-- Задачи
-- ---------------------------------------------------------------------------

create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null default public.my_family_id() references public.families (id) on delete cascade,
  -- Личная задача: видит только owner_id. Общая: видят и меняют оба.
  owner_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  shared       boolean not null default false,
  -- Ответственный в общей задаче: null — оба.
  assignee_id  uuid references auth.users (id) on delete set null,
  plan_id      uuid references public.plans (id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 200),
  note         text check (char_length(note) <= 2000),
  due_date     date,
  priority     smallint not null default 2 check (priority between 1 and 3),  -- 1 важно, 2 обычно, 3 не срочно
  status       text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  done_at      timestamptz,
  done_by      uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- Подзадачи планов и назначения на партнёра — только в общих задачах.
  check (shared or (plan_id is null and assignee_id is null))
);

create index tasks_family_idx on public.tasks (family_id, status);
create index tasks_owner_idx on public.tasks (owner_id, status);
create index tasks_plan_idx on public.tasks (plan_id);
create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Привычки и цели (личные)
-- ---------------------------------------------------------------------------

create table public.habits (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title          text not null check (char_length(title) between 1 and 80),
  emoji          text not null default '✅' check (char_length(emoji) <= 8),
  -- daily — каждый день; weekly — target_per_week раз в неделю.
  frequency      text not null default 'daily' check (frequency in ('daily', 'weekly')),
  target_per_week smallint not null default 3 check (target_per_week between 1 and 7),
  archived       boolean not null default false,
  created_at     timestamptz not null default now()
);

create index habits_user_idx on public.habits (user_id);

create table public.habit_checks (
  habit_id   uuid not null references public.habits (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  check_date date not null,
  created_at timestamptz not null default now(),
  primary key (habit_id, check_date)
);

create index habit_checks_user_date_idx on public.habit_checks (user_id, check_date);

create table public.goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 100),
  deadline    date,
  target      numeric(10, 1) check (target > 0),
  current     numeric(10, 1) not null default 0 check (current >= 0),
  unit        text check (char_length(unit) <= 20),
  done        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index goals_user_idx on public.goals (user_id);

-- ---------------------------------------------------------------------------
-- Домашние дела по очереди (общие)
-- ---------------------------------------------------------------------------

create table public.chores (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null default public.my_family_id() references public.families (id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 80),
  emoji         text not null default '🧹' check (char_length(emoji) <= 8),
  every_days    smallint not null default 7 check (every_days between 1 and 90),
  -- Чередовать ответственного после каждого выполнения.
  rotate        boolean not null default true,
  assignee_id   uuid references auth.users (id) on delete set null,
  next_due      date not null,
  last_done_on  date,
  last_done_by  uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index chores_family_idx on public.chores (family_id, next_due);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.plans enable row level security;
alter table public.tasks enable row level security;
alter table public.habits enable row level security;
alter table public.habit_checks enable row level security;
alter table public.goals enable row level security;
alter table public.chores enable row level security;

create policy "plans: семья" on public.plans
  for all to authenticated using (family_id = public.my_family_id()) with check (family_id = public.my_family_id());

-- Ответственный и план должны быть из своей семьи (профиль партнёра виден по RLS profiles).
create policy "tasks: читать" on public.tasks
  for select to authenticated
  using (family_id = public.my_family_id() and (shared or owner_id = auth.uid()));
create policy "tasks: добавлять" on public.tasks
  for insert to authenticated
  with check (
    family_id = public.my_family_id()
    and owner_id = auth.uid()
    and (assignee_id is null or exists (select 1 from public.profiles p where p.id = assignee_id and p.family_id = public.my_family_id()))
    and (plan_id is null or exists (select 1 from public.plans pl where pl.id = plan_id))
  );
create policy "tasks: менять" on public.tasks
  for update to authenticated
  using (family_id = public.my_family_id() and (shared or owner_id = auth.uid()))
  with check (
    family_id = public.my_family_id()
    and (shared or owner_id = auth.uid())
    and (assignee_id is null or exists (select 1 from public.profiles p where p.id = assignee_id and p.family_id = public.my_family_id()))
    and (plan_id is null or exists (select 1 from public.plans pl where pl.id = plan_id))
  );
create policy "tasks: удалять" on public.tasks
  for delete to authenticated
  using (family_id = public.my_family_id() and (shared or owner_id = auth.uid()));

create policy "habits: свои" on public.habits
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "habit_checks: свои" on public.habit_checks
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()));
create policy "goals: свои" on public.goals
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "chores: семья" on public.chores
  for all to authenticated
  using (family_id = public.my_family_id())
  with check (
    family_id = public.my_family_id()
    and (assignee_id is null or exists (select 1 from public.profiles p where p.id = assignee_id and p.family_id = public.my_family_id()))
  );

-- Владелец и семья задачи не меняются (иначе можно «подарить» личную задачу партнёру).
revoke update on public.tasks from authenticated;
grant update (shared, assignee_id, plan_id, title, note, due_date, priority, status, done_at, done_by)
  on public.tasks to authenticated;

revoke all on public.plans, public.tasks, public.habits, public.habit_checks, public.goals, public.chores from anon;
