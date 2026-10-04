-- Этап 1. Основа: семьи, профили, вход.
--
-- Правило доступа для всего приложения:
--   * личные таблицы  — строку видит только владелец:      user_id = auth.uid()
--   * общие таблицы   — строку видят оба члена семьи:      family_id = public.my_family_id()
-- В семье не больше двух человек.

-- ---------------------------------------------------------------------------
-- Таблицы
-- ---------------------------------------------------------------------------

create table public.families (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 60),
  invite_code text not null unique
              default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  family_id    uuid references public.families (id) on delete set null,
  display_name text not null default '' check (char_length(display_name) <= 40),
  avatar_emoji text not null default '🙂' check (char_length(avatar_emoji) <= 8),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index profiles_family_id_idx on public.profiles (family_id);

-- ---------------------------------------------------------------------------
-- Вспомогательные функции
-- ---------------------------------------------------------------------------

-- Семья текущего пользователя. security definer, чтобы политики на profiles
-- не вызывали сами себя рекурсивно.
create or replace function public.my_family_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select family_id from public.profiles where id = auth.uid()
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Профиль создаётся автоматически при регистрации.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)), 40)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Создание семьи и вступление по коду (только через эти функции)
-- ---------------------------------------------------------------------------

create or replace function public.create_family(p_name text)
returns public.families
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_family public.families;
begin
  if auth.uid() is null then
    raise exception 'Нужно войти в аккаунт';
  end if;
  if public.my_family_id() is not null then
    raise exception 'Вы уже состоите в семье';
  end if;

  insert into public.families (name, created_by)
  values (coalesce(nullif(trim(p_name), ''), 'Наша семья'), auth.uid())
  returning * into v_family;

  update public.profiles set family_id = v_family.id where id = auth.uid();
  return v_family;
end;
$$;

create or replace function public.join_family(p_code text)
returns public.families
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_family  public.families;
  v_members int;
begin
  if auth.uid() is null then
    raise exception 'Нужно войти в аккаунт';
  end if;
  if public.my_family_id() is not null then
    raise exception 'Вы уже состоите в семье';
  end if;

  select * into v_family
  from public.families
  where invite_code = upper(trim(p_code))
  for update;

  if v_family.id is null then
    raise exception 'Семья с таким кодом не найдена';
  end if;

  select count(*) into v_members from public.profiles where family_id = v_family.id;
  if v_members >= 2 then
    raise exception 'В этой семье уже два человека';
  end if;

  update public.profiles set family_id = v_family.id where id = auth.uid();
  return v_family;
end;
$$;

revoke all on function public.create_family(text) from public, anon;
revoke all on function public.join_family(text) from public, anon;
grant execute on function public.create_family(text) to authenticated;
grant execute on function public.join_family(text) to authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.families enable row level security;
alter table public.profiles enable row level security;

-- Семью видят и переименовывают только её члены. Создание — через create_family().
create policy "families: члены семьи читают"
  on public.families for select to authenticated
  using (id = public.my_family_id());

create policy "families: члены семьи переименовывают"
  on public.families for update to authenticated
  using (id = public.my_family_id())
  with check (id = public.my_family_id());

-- Профиль: свой + профиль партнёра (только имя и аватар — здесь нет личных данных).
create policy "profiles: свой и партнёра"
  on public.profiles for select to authenticated
  using (id = auth.uid() or (family_id is not null and family_id = public.my_family_id()));

create policy "profiles: правлю только свой"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Менять напрямую можно только имя и аватар; семья — через функции выше.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name, avatar_emoji) on public.profiles to authenticated;

revoke insert, update, delete on public.families from anon, authenticated;
grant update (name) on public.families to authenticated;
