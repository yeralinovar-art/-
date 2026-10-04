-- Этап 2, часть 1: профиль здоровья (в т.ч. беременность), вес, дневник питания, вода.
-- Все таблицы здесь личные (видит только владелец), кроме справочника продуктов:
-- общие продукты (family_id is null) видят все, свои блюда семьи — оба члена семьи.

-- ---------------------------------------------------------------------------
-- Профиль здоровья — личный. Данные о беременности видит только владелец.
-- ---------------------------------------------------------------------------

create table public.health_profiles (
  user_id               uuid primary key references auth.users (id) on delete cascade,
  sex                   text check (sex in ('female', 'male')),
  birth_date            date,
  height_cm             numeric(5, 1) check (height_cm between 100 and 250),
  activity_level        text not null default 'light'
                        check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  kcal_target_override  int check (kcal_target_override between 800 and 6000),
  goal_weight_kg        numeric(5, 1) check (goal_weight_kg between 30 and 300),
  goal_date             date,
  water_goal_ml         int not null default 2000 check (water_goal_ml between 500 and 6000),

  -- Беременность
  is_pregnant           boolean not null default false,
  due_date              date,
  pre_pregnancy_weight_kg numeric(5, 1) check (pre_pregnancy_weight_kg between 30 and 300),
  -- Коридор набора за всю беременность; пусто — нормы IOM по ИМТ до беременности.
  gain_min_kg           numeric(4, 1) check (gain_min_kg between 0 and 40),
  gain_max_kg           numeric(4, 1) check (gain_max_kg between 0 and 40),
  -- Надбавка к норме по триместрам, ккал (по умолчанию 0 / 340 / 450).
  tri1_bonus_kcal       int not null default 0 check (tri1_bonus_kcal between 0 and 1500),
  tri2_bonus_kcal       int not null default 340 check (tri2_bonus_kcal between 0 and 1500),
  tri3_bonus_kcal       int not null default 450 check (tri3_bonus_kcal between 0 and 1500),
  caffeine_limit_mg     int not null default 200 check (caffeine_limit_mg between 0 and 1000),

  updated_at            timestamptz not null default now()
);

create trigger health_profiles_set_updated_at
  before update on public.health_profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Вес и замеры — личные. Одна запись в день.
-- ---------------------------------------------------------------------------

create table public.weight_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  entry_date  date not null,
  weight_kg   numeric(5, 2) not null check (weight_kg between 20 and 350),
  waist_cm    numeric(5, 1) check (waist_cm between 30 and 250),
  hips_cm     numeric(5, 1) check (hips_cm between 30 and 250),
  chest_cm    numeric(5, 1) check (chest_cm between 30 and 250),
  note        text check (char_length(note) <= 300),
  created_at  timestamptz not null default now(),
  unique (user_id, entry_date)
);

-- ---------------------------------------------------------------------------
-- Справочник продуктов: общий (family_id is null) + блюда семьи.
-- Значения на 100 г (для напитков — на 100 мл).
-- ---------------------------------------------------------------------------

create table public.foods (
  id                 uuid primary key default gen_random_uuid(),
  family_id          uuid references public.families (id) on delete cascade,
  created_by         uuid references auth.users (id) on delete set null default auth.uid(),
  name               text not null check (char_length(name) between 1 and 120),
  brand              text check (char_length(brand) <= 80),
  barcode            text check (barcode ~ '^[0-9]{6,14}$'),
  kcal_100           numeric(6, 1) not null check (kcal_100 between 0 and 950),
  protein_100        numeric(5, 1) not null default 0 check (protein_100 between 0 and 100),
  fat_100            numeric(5, 1) not null default 0 check (fat_100 between 0 and 100),
  carbs_100          numeric(5, 1) not null default 0 check (carbs_100 between 0 and 100),
  caffeine_100       numeric(6, 1) not null default 0 check (caffeine_100 between 0 and 1000),
  portion_g          numeric(6, 1) not null default 100 check (portion_g between 1 and 2000),
  portion_label      text check (char_length(portion_label) <= 40),
  -- Мягкое предупреждение для режима беременности (алкоголь, сырая рыба и т.п.).
  pregnancy_warning  text check (char_length(pregnancy_warning) <= 200),
  created_at         timestamptz not null default now()
);

create index foods_family_id_idx on public.foods (family_id);
create index foods_barcode_idx on public.foods (barcode) where barcode is not null;
create unique index foods_family_barcode_uniq on public.foods (family_id, barcode) where barcode is not null;

-- ---------------------------------------------------------------------------
-- Дневник питания — личный. Значения сохраняются снимком на момент записи.
-- ---------------------------------------------------------------------------

create table public.food_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  entry_date   date not null,
  meal         text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  food_id      uuid references public.foods (id) on delete set null,
  name         text not null check (char_length(name) between 1 and 120),
  grams        numeric(6, 1) check (grams between 1 and 5000),
  kcal         numeric(6, 1) not null check (kcal between 0 and 10000),
  protein      numeric(5, 1) not null default 0 check (protein >= 0),
  fat          numeric(5, 1) not null default 0 check (fat >= 0),
  carbs        numeric(5, 1) not null default 0 check (carbs >= 0),
  caffeine_mg  numeric(6, 1) not null default 0 check (caffeine_mg >= 0),
  created_at   timestamptz not null default now()
);

create index food_entries_user_date_idx on public.food_entries (user_id, entry_date);

-- ---------------------------------------------------------------------------
-- Вода и прочие дневные итоги — личные. Одна строка в день.
-- ---------------------------------------------------------------------------

create table public.daily_logs (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  log_date   date not null,
  water_ml   int not null default 0 check (water_ml between 0 and 20000),
  primary key (user_id, log_date)
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.health_profiles enable row level security;
alter table public.weight_entries  enable row level security;
alter table public.foods           enable row level security;
alter table public.food_entries    enable row level security;
alter table public.daily_logs      enable row level security;

-- Личные таблицы: всё только со своими строками.
create policy "health_profiles: только владелец" on public.health_profiles
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "weight_entries: только владелец" on public.weight_entries
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "food_entries: только владелец" on public.food_entries
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "daily_logs: только владелец" on public.daily_logs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Продукты: общие видят все вошедшие, блюда семьи — только эта семья.
create policy "foods: общие и своей семьи" on public.foods
  for select to authenticated
  using (family_id is null or family_id = public.my_family_id());

create policy "foods: добавляю в свою семью" on public.foods
  for insert to authenticated
  with check (family_id = public.my_family_id() and created_by = auth.uid());

create policy "foods: правлю блюда своей семьи" on public.foods
  for update to authenticated
  using (family_id = public.my_family_id())
  with check (family_id = public.my_family_id());

create policy "foods: удаляю блюда своей семьи" on public.foods
  for delete to authenticated
  using (family_id = public.my_family_id());

revoke all on public.health_profiles, public.weight_entries, public.foods,
              public.food_entries, public.daily_logs from anon;

-- ---------------------------------------------------------------------------
-- Стартовый справочник: базовые продукты и казахская кухня.
-- Калорийность — средние значения на 100 г готового блюда.
-- ---------------------------------------------------------------------------

insert into public.foods
  (family_id, created_by, name, kcal_100, protein_100, fat_100, carbs_100, caffeine_100, portion_g, portion_label, pregnancy_warning)
values
  -- Казахская кухня
  (null, null, 'Бешбармак',              215, 13.0, 12.0, 14.0, 0, 350, 'тарелка', null),
  (null, null, 'Плов с бараниной',       200,  7.0,  9.5, 22.0, 0, 300, 'тарелка', null),
  (null, null, 'Плов с говядиной',       180,  7.5,  7.0, 22.0, 0, 300, 'тарелка', null),
  (null, null, 'Баурсаки',               380,  8.0, 17.0, 48.0, 0,  30, '1 шт', null),
  (null, null, 'Манты',                  220, 10.0, 11.0, 20.0, 0,  70, '1 шт', null),
  (null, null, 'Лагман',                 125,  6.0,  4.5, 15.0, 0, 400, 'тарелка', null),
  (null, null, 'Самса с мясом',          310, 11.0, 17.0, 28.0, 0, 120, '1 шт', null),
  (null, null, 'Куырдак',                250, 17.0, 19.0,  3.0, 0, 250, 'порция', null),
  (null, null, 'Казы',                   390, 15.0, 36.0,  0.5, 0,  50, '5 ломтиков', null),
  (null, null, 'Шашлык из баранины',     260, 20.0, 19.5,  0.5, 0, 200, 'порция', null),
  (null, null, 'Шашлык из курицы',       180, 22.0, 10.0,  1.0, 0, 200, 'порция', null),
  (null, null, 'Сорпа (бульон)',          35,  3.0,  2.0,  1.0, 0, 300, 'пиала', null),
  (null, null, 'Наурыз-коже',             65,  2.5,  1.5, 10.5, 0, 300, 'пиала', null),
  (null, null, 'Иримшик',                360, 14.0, 12.0, 50.0, 0,  30, 'горсть', null),
  (null, null, 'Курт',                   310, 30.0, 12.0, 18.0, 0,  20, '2 шарика', null),
  (null, null, 'Кумыс',                   50,  2.1,  1.9,  5.0, 0, 250, 'стакан', 'Содержит немного алкоголя'),
  (null, null, 'Шубат',                   90,  3.5,  5.0,  7.0, 0, 250, 'стакан', 'Только пастеризованный'),
  (null, null, 'Чак-чак',                450,  7.0, 20.0, 60.0, 0,  50, 'кусочек', null),
  (null, null, 'Пельмени',               250, 11.0, 12.0, 24.0, 0, 250, 'порция', null),
  (null, null, 'Чай с молоком',           35,  1.0,  1.3,  4.5, 15, 200, 'пиала', null),
  -- Крупы, хлеб, гарниры
  (null, null, 'Рис отварной',           116,  2.2,  0.5, 25.0, 0, 150, 'порция', null),
  (null, null, 'Гречка отварная',        110,  4.2,  1.1, 21.0, 0, 150, 'порция', null),
  (null, null, 'Овсянка на воде',         88,  3.0,  1.7, 15.0, 0, 250, 'тарелка', null),
  (null, null, 'Овсянка на молоке',      105,  3.6,  3.0, 16.0, 0, 250, 'тарелка', null),
  (null, null, 'Макароны отварные',      112,  3.5,  0.4, 23.0, 0, 200, 'порция', null),
  (null, null, 'Картофель отварной',      82,  2.0,  0.4, 17.0, 0, 200, 'порция', null),
  (null, null, 'Картофельное пюре',      106,  2.5,  4.0, 15.0, 0, 200, 'порция', null),
  (null, null, 'Хлеб белый',             265,  8.0,  3.0, 50.0, 0,  30, 'ломтик', null),
  (null, null, 'Хлеб ржаной',            210,  6.5,  1.2, 41.0, 0,  30, 'ломтик', null),
  (null, null, 'Лепёшка (нан)',          270,  8.5,  4.0, 50.0, 0,  80, 'четверть', null),
  -- Мясо, рыба, яйца
  (null, null, 'Куриная грудка отварная',137, 29.0,  1.8,  0.5, 0, 150, 'порция', null),
  (null, null, 'Курица запечённая',      210, 24.0, 12.5,  0.0, 0, 150, 'порция', null),
  (null, null, 'Говядина отварная',      254, 25.8, 16.8,  0.0, 0, 120, 'порция', null),
  (null, null, 'Баранина тушёная',       290, 23.0, 22.0,  0.0, 0, 120, 'порция', null),
  (null, null, 'Котлета говяжья',        230, 16.0, 15.0,  8.0, 0,  80, '1 шт', null),
  (null, null, 'Лосось запечённый',      206, 22.0, 13.0,  0.0, 0, 150, 'порция', 'Только хорошо прожаренный'),
  (null, null, 'Треска запечённая',      105, 23.0,  1.0,  0.0, 0, 150, 'порция', null),
  (null, null, 'Тунец консервированный', 116, 25.5,  1.0,  0.0, 0,  80, 'полбанки', 'Не чаще 1–2 раз в неделю (ртуть)'),
  (null, null, 'Роллы с сырой рыбой',    170,  6.5,  4.5, 26.0, 0, 200, '8 шт', 'Сырая рыба — лучше избегать'),
  (null, null, 'Яйцо куриное варёное',   155, 12.6, 10.6,  1.1, 0,  55, '1 шт', 'Только вкрутую'),
  (null, null, 'Омлет',                  185, 10.0, 15.0,  2.0, 0, 150, 'порция', null),
  (null, null, 'Сосиски',                260, 11.0, 23.0,  1.5, 0,  50, '1 шт', null),
  -- Молочное
  (null, null, 'Молоко 2,5%',             52,  2.8,  2.5,  4.7, 0, 200, 'стакан', null),
  (null, null, 'Кефир 2,5%',              53,  2.9,  2.5,  4.0, 0, 200, 'стакан', null),
  (null, null, 'Творог 5%',              121, 17.2,  5.0,  1.8, 0, 150, 'порция', null),
  (null, null, 'Йогурт натуральный',      66,  5.0,  3.2,  3.5, 0, 150, 'баночка', null),
  (null, null, 'Сметана 15%',            160,  2.6, 15.0,  3.0, 0,  20, 'ложка', null),
  (null, null, 'Сыр твёрдый',            360, 25.0, 28.0,  0.0, 0,  20, 'ломтик', null),
  (null, null, 'Сыр с плесенью (бри)',   334, 21.0, 28.0,  0.5, 0,  30, 'кусочек', 'Только пастеризованный, лучше после нагрева'),
  (null, null, 'Масло сливочное',        748,  0.5, 82.5,  0.8, 0,  10, 'чайная ложка', null),
  -- Овощи и фрукты
  (null, null, 'Огурец',                  15,  0.8,  0.1,  2.8, 0, 100, '1 шт', null),
  (null, null, 'Помидор',                 20,  1.0,  0.2,  3.7, 0, 120, '1 шт', null),
  (null, null, 'Салат из свежих овощей',  45,  1.0,  3.0,  4.0, 0, 150, 'порция', null),
  (null, null, 'Морковь',                 35,  1.3,  0.1,  6.9, 0,  80, '1 шт', null),
  (null, null, 'Яблоко',                  47,  0.4,  0.4,  9.8, 0, 180, '1 шт', null),
  (null, null, 'Банан',                   89,  1.1,  0.3, 22.8, 0, 120, '1 шт', null),
  (null, null, 'Груша',                   47,  0.4,  0.3, 10.3, 0, 170, '1 шт', null),
  (null, null, 'Апельсин',                43,  0.9,  0.2,  8.1, 0, 200, '1 шт', null),
  (null, null, 'Мандарин',                38,  0.8,  0.2,  7.5, 0,  80, '1 шт', null),
  (null, null, 'Виноград',                69,  0.6,  0.2, 16.8, 0, 150, 'гроздь', null),
  (null, null, 'Арбуз',                   27,  0.6,  0.1,  5.8, 0, 300, 'ломоть', null),
  (null, null, 'Дыня',                    35,  0.6,  0.3,  7.4, 0, 300, 'ломоть', null),
  (null, null, 'Авокадо',                160,  2.0, 14.7,  1.8, 0,  70, 'половина', null),
  -- Супы
  (null, null, 'Борщ',                    50,  2.5,  2.5,  4.5, 0, 300, 'тарелка', null),
  (null, null, 'Суп куриный с лапшой',    45,  3.0,  1.5,  5.0, 0, 300, 'тарелка', null),
  -- Перекусы, сладкое
  (null, null, 'Грецкие орехи',          654, 15.2, 65.2,  7.0, 0,  30, 'горсть', null),
  (null, null, 'Миндаль',                579, 21.0, 50.0, 10.0, 0,  30, 'горсть', null),
  (null, null, 'Курага',                 232,  5.2,  0.3, 51.0, 0,  30, 'горсть', null),
  (null, null, 'Шоколад молочный',       535,  7.6, 30.0, 59.0, 20,  25, '1/4 плитки', null),
  (null, null, 'Шоколад тёмный 70%',     560,  7.8, 42.0, 34.0, 80,  25, '1/4 плитки', null),
  (null, null, 'Печенье',                420,  7.0, 14.0, 68.0, 0,  15, '1 шт', null),
  (null, null, 'Мёд',                    304,  0.3,  0.0, 82.0, 0,  15, 'ложка', null),
  (null, null, 'Сахар',                  399,  0.0,  0.0, 99.8, 0,   5, 'чайная ложка', null),
  (null, null, 'Масло подсолнечное',     899,  0.0, 99.9,  0.0, 0,  10, 'столовая ложка', null),
  -- Напитки (на 100 мл)
  (null, null, 'Кофе американо',           2,  0.1,  0.0,  0.3, 40, 250, 'чашка', null),
  (null, null, 'Эспрессо',                 9,  0.1,  0.2,  1.7, 212, 30, '1 порция', null),
  (null, null, 'Капучино',                 45,  2.5,  2.0,  4.0, 30, 250, 'чашка', null),
  (null, null, 'Латте',                    55,  3.0,  2.5,  5.0, 25, 300, 'стакан', null),
  (null, null, 'Чай чёрный',               1,  0.0,  0.0,  0.2, 20, 250, 'чашка', null),
  (null, null, 'Чай зелёный',              1,  0.0,  0.0,  0.2, 12, 250, 'чашка', null),
  (null, null, 'Кола',                    42,  0.0,  0.0, 10.6, 10, 330, 'банка', null),
  (null, null, 'Сок апельсиновый',        45,  0.7,  0.2, 10.4, 0, 200, 'стакан', null),
  (null, null, 'Компот',                  60,  0.2,  0.0, 15.0, 0, 200, 'стакан', null),
  (null, null, 'Вино сухое',              68,  0.1,  0.0,  0.3, 0, 150, 'бокал', 'Алкоголь при беременности исключён'),
  (null, null, 'Пиво',                    43,  0.5,  0.0,  3.6, 0, 500, 'бокал', 'Алкоголь при беременности исключён');
