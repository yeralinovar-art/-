-- Этап 3: меню семьи — рецепты, недельный планер, список покупок, бюджет на продукты.
-- Всё здесь общее для семьи (family_id = my_family_id()).
-- Готовые рецепты-шаблоны (family_id is null) видят все, менять их нельзя.

-- ---------------------------------------------------------------------------
-- Отделы магазина и сырые ингредиенты в справочнике
-- ---------------------------------------------------------------------------

alter table public.foods add column department text check (department in (
  'Овощи и фрукты', 'Мясо и птица', 'Рыба', 'Молочное и яйца', 'Бакалея',
  'Хлеб и выпечка', 'Напитки', 'Сладкое и снеки', 'Заморозка', 'Другое'
));

insert into public.foods
  (family_id, created_by, name, kcal_100, protein_100, fat_100, carbs_100, caffeine_100, portion_g, portion_label, pregnancy_warning, unit, department)
values
  (null, null, 'Говядина (сырая)',          187, 18.9, 12.4,  0.0, 0, 100, null, null, 'г', 'Мясо и птица'),
  (null, null, 'Баранина (сырая)',          209, 15.6, 16.3,  0.0, 0, 100, null, null, 'г', 'Мясо и птица'),
  (null, null, 'Конина (сырая)',            167, 20.2,  9.5,  0.0, 0, 100, null, null, 'г', 'Мясо и птица'),
  (null, null, 'Куриное филе (сырое)',      113, 23.6,  1.9,  0.4, 0, 100, null, null, 'г', 'Мясо и птица'),
  (null, null, 'Курица целая (сырая)',      190, 16.0, 14.0,  0.0, 0, 100, null, null, 'г', 'Мясо и птица'),
  (null, null, 'Куриные бёдра (сырые)',     185, 16.8, 13.0,  0.0, 0, 100, null, null, 'г', 'Мясо и птица'),
  (null, null, 'Фарш говяжий (сырой)',      254, 17.2, 20.0,  0.0, 0, 100, null, null, 'г', 'Мясо и птица'),
  (null, null, 'Индейка филе (сырое)',      114, 23.0,  2.0,  0.0, 0, 100, null, null, 'г', 'Мясо и птица'),
  (null, null, 'Филе трески (сырое)',        78, 17.7,  0.7,  0.0, 0, 100, null, null, 'г', 'Рыба'),
  (null, null, 'Филе лосося (сырое)',       208, 20.0, 13.0,  0.0, 0, 100, null, 'Только после хорошей термообработки', 'г', 'Рыба'),
  (null, null, 'Яйцо куриное (сырое)',      157, 12.7, 10.9,  0.7, 0,  55, '1 шт', 'Только после термообработки', 'г', 'Молочное и яйца'),
  (null, null, 'Молоко (для готовки)',       52,  2.8,  2.5,  4.7, 0, 100, null, null, 'мл', 'Молочное и яйца'),
  (null, null, 'Творог 5% (для готовки)',   121, 17.2,  5.0,  1.8, 0, 100, null, null, 'г', 'Молочное и яйца'),
  (null, null, 'Сметана 20%',               206,  2.8, 20.0,  3.2, 0, 100, null, null, 'г', 'Молочное и яйца'),
  (null, null, 'Сыр твёрдый (для готовки)', 360, 25.0, 28.0,  0.0, 0, 100, null, null, 'г', 'Молочное и яйца'),
  (null, null, 'Масло сливочное (для готовки)', 748, 0.5, 82.5, 0.8, 0, 100, null, null, 'г', 'Молочное и яйца'),
  (null, null, 'Мука пшеничная',            334, 10.3,  1.1, 70.0, 0, 100, null, null, 'г', 'Бакалея'),
  (null, null, 'Рис (сухой)',               344,  6.7,  0.7, 78.9, 0, 100, null, null, 'г', 'Бакалея'),
  (null, null, 'Гречка (сухая)',            313, 12.6,  3.3, 62.1, 0, 100, null, null, 'г', 'Бакалея'),
  (null, null, 'Овсяные хлопья',            352, 12.3,  6.2, 61.8, 0, 100, null, null, 'г', 'Бакалея'),
  (null, null, 'Макароны (сухие)',          344, 10.4,  1.1, 71.5, 0, 100, null, null, 'г', 'Бакалея'),
  (null, null, 'Лапша для лагмана',         340, 11.0,  1.5, 70.0, 0, 100, null, null, 'г', 'Бакалея'),
  (null, null, 'Сахар (для готовки)',       399,  0.0,  0.0, 99.8, 0, 100, null, null, 'г', 'Бакалея'),
  (null, null, 'Соль',                        0,  0.0,  0.0,  0.0, 0,   5, null, null, 'г', 'Бакалея'),
  (null, null, 'Масло растительное',        899,  0.0, 99.9,  0.0, 0, 100, null, null, 'мл', 'Бакалея'),
  (null, null, 'Томатная паста',            100,  4.8,  0.0, 19.0, 0, 100, null, null, 'г', 'Бакалея'),
  (null, null, 'Чечевица (сухая)',          295, 24.0,  1.5, 46.3, 0, 100, null, null, 'г', 'Бакалея'),
  (null, null, 'Специи',                      0,  0.0,  0.0,  0.0, 0,   5, null, null, 'г', 'Бакалея'),
  (null, null, 'Лук репчатый',               41,  1.4,  0.0,  8.2, 0,  80, '1 шт', null, 'г', 'Овощи и фрукты'),
  (null, null, 'Морковь (сырая)',            35,  1.3,  0.1,  6.9, 0,  80, '1 шт', null, 'г', 'Овощи и фрукты'),
  (null, null, 'Картофель (сырой)',          77,  2.0,  0.4, 16.3, 0, 120, '1 шт', null, 'г', 'Овощи и фрукты'),
  (null, null, 'Чеснок',                    143,  6.5,  0.5, 29.9, 0,   5, '1 зубчик', null, 'г', 'Овощи и фрукты'),
  (null, null, 'Помидор (для готовки)',      20,  1.0,  0.2,  3.7, 0, 120, '1 шт', null, 'г', 'Овощи и фрукты'),
  (null, null, 'Огурец (для салата)',        15,  0.8,  0.1,  2.8, 0, 100, '1 шт', null, 'г', 'Овощи и фрукты'),
  (null, null, 'Перец болгарский (сырой)',   27,  1.3,  0.1,  5.3, 0, 150, '1 шт', null, 'г', 'Овощи и фрукты'),
  (null, null, 'Капуста белокочанная',       27,  1.8,  0.1,  4.7, 0, 100, null, null, 'г', 'Овощи и фрукты'),
  (null, null, 'Свёкла (сырая)',             42,  1.5,  0.1,  8.8, 0, 150, '1 шт', null, 'г', 'Овощи и фрукты'),
  (null, null, 'Зелень',                     40,  3.0,  0.5,  6.0, 0,  20, 'пучок', null, 'г', 'Овощи и фрукты'),
  (null, null, 'Лимон',                      29,  1.1,  0.3,  3.0, 0,  60, '1 шт', null, 'г', 'Овощи и фрукты'),
  (null, null, 'Тыква (сырая)',              26,  1.0,  0.1,  6.5, 0, 100, null, null, 'г', 'Овощи и фрукты'),
  (null, null, 'Хлеб (для готовки)',        250,  8.0,  3.0, 48.0, 0,  30, 'ломтик', null, 'г', 'Хлеб и выпечка');

-- ---------------------------------------------------------------------------
-- Рецепты
-- ---------------------------------------------------------------------------

create table public.recipes (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid references public.families (id) on delete cascade,  -- null = готовый шаблон
  title         text not null check (char_length(title) between 1 and 100),
  servings      int not null default 4 check (servings between 1 and 30),
  cook_minutes  int check (cook_minutes between 1 and 1440),
  steps         text check (char_length(steps) <= 6000),
  photo_path    text check (char_length(photo_path) <= 300),
  kid_friendly  boolean not null default true,
  note          text check (char_length(note) <= 300),
  created_by    uuid default auth.uid() references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index recipes_family_idx on public.recipes (family_id);
create trigger recipes_set_updated_at before update on public.recipes
  for each row execute function public.set_updated_at();

create table public.recipe_ingredients (
  id          uuid primary key default gen_random_uuid(),
  recipe_id   uuid not null references public.recipes (id) on delete cascade,
  position    int not null default 0,
  food_id     uuid references public.foods (id) on delete set null,
  name        text not null check (char_length(name) between 1 and 120),
  amount      numeric(7, 1) check (amount > 0 and amount <= 100000),
  unit        text not null default 'г' check (unit in ('г', 'мл', 'шт')),
  -- КБЖУ на всё количество ингредиента (снимок на момент сохранения).
  kcal        numeric(7, 1) not null default 0 check (kcal >= 0),
  protein     numeric(6, 1) not null default 0 check (protein >= 0),
  fat         numeric(6, 1) not null default 0 check (fat >= 0),
  carbs       numeric(6, 1) not null default 0 check (carbs >= 0),
  department  text,
  pregnancy_warning text
);

create index recipe_ingredients_recipe_idx on public.recipe_ingredients (recipe_id, position);

-- ---------------------------------------------------------------------------
-- Недельный планер
-- ---------------------------------------------------------------------------

create table public.meal_plan (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null default public.my_family_id() references public.families (id) on delete cascade,
  plan_date   date not null,
  meal        text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  recipe_id   uuid references public.recipes (id) on delete set null,
  title       text not null check (char_length(title) between 1 and 100),
  -- Сколько порций готовим: взрослые по 1, дети по ½.
  servings    numeric(4, 1) not null default 2 check (servings > 0 and servings <= 30),
  note        text check (char_length(note) <= 200),
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index meal_plan_family_date_idx on public.meal_plan (family_id, plan_date);

-- ---------------------------------------------------------------------------
-- Список покупок
-- ---------------------------------------------------------------------------

create table public.shopping_items (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null default public.my_family_id() references public.families (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 120),
  amount      numeric(8, 1) check (amount > 0),
  unit        text check (unit in ('г', 'мл', 'шт')),
  department  text not null default 'Другое',
  checked     boolean not null default false,
  checked_by  uuid references auth.users (id) on delete set null,
  checked_at  timestamptz,
  -- 'menu' — собрано из меню недели week_start; 'manual' — добавлено руками.
  source      text not null default 'manual' check (source in ('menu', 'manual')),
  week_start  date,
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index shopping_items_family_idx on public.shopping_items (family_id, checked);

-- ---------------------------------------------------------------------------
-- Бюджет на продукты
-- ---------------------------------------------------------------------------

create table public.grocery_spend (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null default public.my_family_id() references public.families (id) on delete cascade,
  spent_on    date not null,
  amount      numeric(10, 0) not null check (amount > 0 and amount <= 10000000),
  store       text check (char_length(store) <= 60),
  note        text check (char_length(note) <= 200),
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index grocery_spend_family_date_idx on public.grocery_spend (family_id, spent_on);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.meal_plan enable row level security;
alter table public.shopping_items enable row level security;
alter table public.grocery_spend enable row level security;

create policy "recipes: шаблоны и свои" on public.recipes
  for select to authenticated using (family_id is null or family_id = public.my_family_id());
create policy "recipes: добавляю в семью" on public.recipes
  for insert to authenticated with check (family_id = public.my_family_id());
create policy "recipes: правлю свои" on public.recipes
  for update to authenticated using (family_id = public.my_family_id()) with check (family_id = public.my_family_id());
create policy "recipes: удаляю свои" on public.recipes
  for delete to authenticated using (family_id = public.my_family_id());

-- Ингредиенты видны вместе с рецептом; менять — только у рецептов своей семьи.
create policy "recipe_ingredients: читать" on public.recipe_ingredients
  for select to authenticated using (exists (select 1 from public.recipes r where r.id = recipe_id));
create policy "recipe_ingredients: менять" on public.recipe_ingredients
  for all to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.family_id = public.my_family_id()))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.family_id = public.my_family_id()));

create policy "meal_plan: семья" on public.meal_plan
  for all to authenticated using (family_id = public.my_family_id()) with check (family_id = public.my_family_id());
create policy "shopping_items: семья" on public.shopping_items
  for all to authenticated using (family_id = public.my_family_id()) with check (family_id = public.my_family_id());
create policy "grocery_spend: семья" on public.grocery_spend
  for all to authenticated using (family_id = public.my_family_id()) with check (family_id = public.my_family_id());

revoke all on public.recipes, public.recipe_ingredients, public.meal_plan,
              public.shopping_items, public.grocery_spend from anon;

-- Список покупок и меню обновляются у партнёра в реальном времени.
alter publication supabase_realtime add table public.shopping_items, public.meal_plan;

-- ---------------------------------------------------------------------------
-- Фото рецептов: приватная корзина, папка = id семьи.
-- (Локальная копия без сервиса хранилища пропускает этот блок.)
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('storage.buckets') is null then
    raise notice 'storage не найден — пропускаю фото рецептов';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('recipe-photos', 'recipe-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do nothing;

  execute $p$
    create policy "recipe-photos: семья читает" on storage.objects for select to authenticated
    using (bucket_id = 'recipe-photos' and (storage.foldername(name))[1] = public.my_family_id()::text)
  $p$;
  execute $p$
    create policy "recipe-photos: семья загружает" on storage.objects for insert to authenticated
    with check (bucket_id = 'recipe-photos' and (storage.foldername(name))[1] = public.my_family_id()::text)
  $p$;
  execute $p$
    create policy "recipe-photos: семья удаляет" on storage.objects for delete to authenticated
    using (bucket_id = 'recipe-photos' and (storage.foldername(name))[1] = public.my_family_id()::text)
  $p$;
end
$$;

-- ---------------------------------------------------------------------------
-- Готовые рецепты-шаблоны (их можно скопировать в семью и поменять)
-- ---------------------------------------------------------------------------

with r (title, servings, cook_minutes, kid_friendly, steps) as (values
  ('Бешбармак', 6, 180, true,
   E'1. Мясо залить холодной водой, довести до кипения, снять пену. Варить на слабом огне 2,5 часа, посолить за 30 минут до готовности.\n2. Замесить крутое тесто из муки, яйца, щепотки соли и ~100 мл воды, дать отдохнуть 30 минут.\n3. Тонко раскатать, нарезать ромбами, отварить в бульоне 3–4 минуты.\n4. Лук нарезать кольцами, залить горячим бульоном (тузлык).\n5. Выложить тесто, сверху мясо и лук. Бульон подать в пиалах.'),
  ('Плов', 6, 120, true,
   E'1. Рис промыть до прозрачной воды и замочить.\n2. В казане раскалить масло, обжарить мясо кусками до корочки.\n3. Добавить лук, затем морковь соломкой, жарить 10 минут.\n4. Залить водой, добавить специи и соль, тушить 40 минут (зирвак).\n5. Выложить рис ровным слоем, залить водой на 1,5 см выше, воткнуть головку чеснока.\n6. Когда вода впитается, собрать горкой, закрыть крышкой и томить 20–25 минут.'),
  ('Лагман', 4, 90, false,
   E'1. Мясо нарезать соломкой, обжарить на сильном огне.\n2. Добавить лук, перец, помидоры и чеснок, жарить 5 минут.\n3. Добавить томатную пасту и специи, залить 500 мл воды, тушить 30 минут.\n4. Лапшу отварить, промыть.\n5. Разложить лапшу по тарелкам и полить подливой. Для детей — без острых специй.'),
  ('Сорпа с картофелем', 5, 150, true,
   E'1. Баранину залить водой, довести до кипения, снять пену.\n2. Варить на слабом огне 2 часа с целой луковицей.\n3. Добавить картофель крупными кусками, посолить, варить 20 минут.\n4. Подавать с зеленью.'),
  ('Овсянка на молоке', 4, 10, true,
   E'1. Довести молоко до кипения.\n2. Всыпать хлопья, варить 5–7 минут, помешивая.\n3. Добавить сахар и масло. Можно добавить фрукты.'),
  ('Сырники', 4, 30, true,
   E'1. Творог размять вилкой, добавить яйца и сахар.\n2. Всыпать муку, перемешать.\n3. Сформировать сырники, обвалять в муке.\n4. Обжарить на среднем огне по 3–4 минуты с каждой стороны до румяной корочки.'),
  ('Гречка с курицей', 4, 40, true,
   E'1. Курицу нарезать кусочками, обжарить с луком и морковью.\n2. Добавить промытую гречку, залить 600 мл воды, посолить.\n3. Тушить под крышкой 20 минут до готовности.'),
  ('Омлет', 3, 15, true,
   E'1. Взбить яйца с молоком и щепоткой соли.\n2. Растопить масло на сковороде, вылить смесь.\n3. Готовить под крышкой на слабом огне 7–8 минут до полного схватывания.'),
  ('Куриный суп с лапшой', 6, 70, true,
   E'1. Курицу залить 3 л воды, довести до кипения, снять пену, варить 40 минут.\n2. Вынуть курицу, разобрать мясо.\n3. В бульон добавить картофель, морковь и лук, варить 15 минут.\n4. Добавить макароны и мясо, варить до готовности, посолить, добавить зелень.'),
  ('Салат из огурцов и помидоров', 4, 10, true,
   E'1. Нарезать огурцы и помидоры.\n2. Добавить зелень, соль и масло, перемешать перед подачей.'),
  ('Котлеты', 5, 40, true,
   E'1. Хлеб замочить в молоке.\n2. Смешать фарш, хлеб, мелко натёртый лук, яйцо, посолить.\n3. Сформировать котлеты, обжарить с двух сторон по 3 минуты.\n4. Довести до готовности под крышкой 10–12 минут (внутри не должно быть розового).'),
  ('Творожная запеканка', 5, 50, true,
   E'1. Творог смешать с яйцами, сахаром, сметаной и мукой.\n2. Выложить в смазанную форму.\n3. Выпекать при 180 °C 35–40 минут до золотистой корочки.'),
  ('Тыквенный суп-пюре', 4, 35, true,
   E'1. Тыкву, картофель, лук и морковь нарезать кубиками.\n2. Залить 1 л воды, варить 20 минут до мягкости.\n3. Пюрировать блендером, добавить молоко, соль, прогреть.'),
  ('Чечевичный суп', 5, 40, true,
   E'1. Лук и морковь обжарить на масле.\n2. Добавить промытую чечевицу, картофель и 1,5 л воды.\n3. Варить 25 минут, добавить томатную пасту, соль и специи.\n4. По желанию — пюрировать. Подавать с лимоном.')
),
ins_r as (
  insert into public.recipes (family_id, title, servings, cook_minutes, kid_friendly, steps, created_by)
  select null, title, servings, cook_minutes, kid_friendly, steps, null from r
  returning id, title
),
i (title, position, food, amount, unit) as (values
  ('Бешбармак', 1, 'Конина (сырая)', 1000, 'г'), ('Бешбармак', 2, 'Мука пшеничная', 400, 'г'),
  ('Бешбармак', 3, 'Яйцо куриное (сырое)', 1, 'шт'), ('Бешбармак', 4, 'Лук репчатый', 240, 'г'),
  ('Бешбармак', 5, 'Соль', 15, 'г'),
  ('Плов', 1, 'Баранина (сырая)', 700, 'г'), ('Плов', 2, 'Рис (сухой)', 500, 'г'),
  ('Плов', 3, 'Морковь (сырая)', 500, 'г'), ('Плов', 4, 'Лук репчатый', 200, 'г'),
  ('Плов', 5, 'Масло растительное', 100, 'мл'), ('Плов', 6, 'Чеснок', 40, 'г'),
  ('Плов', 7, 'Специи', 10, 'г'), ('Плов', 8, 'Соль', 15, 'г'),
  ('Лагман', 1, 'Говядина (сырая)', 500, 'г'), ('Лагман', 2, 'Лапша для лагмана', 400, 'г'),
  ('Лагман', 3, 'Перец болгарский (сырой)', 300, 'г'), ('Лагман', 4, 'Лук репчатый', 160, 'г'),
  ('Лагман', 5, 'Помидор (для готовки)', 240, 'г'), ('Лагман', 6, 'Чеснок', 15, 'г'),
  ('Лагман', 7, 'Томатная паста', 40, 'г'), ('Лагман', 8, 'Масло растительное', 40, 'мл'),
  ('Лагман', 9, 'Специи', 5, 'г'),
  ('Сорпа с картофелем', 1, 'Баранина (сырая)', 800, 'г'), ('Сорпа с картофелем', 2, 'Картофель (сырой)', 600, 'г'),
  ('Сорпа с картофелем', 3, 'Лук репчатый', 80, 'г'), ('Сорпа с картофелем', 4, 'Зелень', 20, 'г'),
  ('Сорпа с картофелем', 5, 'Соль', 10, 'г'),
  ('Овсянка на молоке', 1, 'Овсяные хлопья', 160, 'г'), ('Овсянка на молоке', 2, 'Молоко (для готовки)', 600, 'мл'),
  ('Овсянка на молоке', 3, 'Масло сливочное (для готовки)', 20, 'г'), ('Овсянка на молоке', 4, 'Сахар (для готовки)', 20, 'г'),
  ('Сырники', 1, 'Творог 5% (для готовки)', 500, 'г'), ('Сырники', 2, 'Яйцо куриное (сырое)', 2, 'шт'),
  ('Сырники', 3, 'Мука пшеничная', 80, 'г'), ('Сырники', 4, 'Сахар (для готовки)', 40, 'г'),
  ('Сырники', 5, 'Масло растительное', 30, 'мл'),
  ('Гречка с курицей', 1, 'Гречка (сухая)', 300, 'г'), ('Гречка с курицей', 2, 'Куриное филе (сырое)', 500, 'г'),
  ('Гречка с курицей', 3, 'Лук репчатый', 80, 'г'), ('Гречка с курицей', 4, 'Морковь (сырая)', 80, 'г'),
  ('Гречка с курицей', 5, 'Масло растительное', 20, 'мл'), ('Гречка с курицей', 6, 'Соль', 5, 'г'),
  ('Омлет', 1, 'Яйцо куриное (сырое)', 6, 'шт'), ('Омлет', 2, 'Молоко (для готовки)', 150, 'мл'),
  ('Омлет', 3, 'Масло сливочное (для готовки)', 10, 'г'),
  ('Куриный суп с лапшой', 1, 'Курица целая (сырая)', 800, 'г'), ('Куриный суп с лапшой', 2, 'Картофель (сырой)', 360, 'г'),
  ('Куриный суп с лапшой', 3, 'Морковь (сырая)', 80, 'г'), ('Куриный суп с лапшой', 4, 'Лук репчатый', 80, 'г'),
  ('Куриный суп с лапшой', 5, 'Макароны (сухие)', 80, 'г'), ('Куриный суп с лапшой', 6, 'Зелень', 20, 'г'),
  ('Куриный суп с лапшой', 7, 'Соль', 10, 'г'),
  ('Салат из огурцов и помидоров', 1, 'Огурец (для салата)', 300, 'г'),
  ('Салат из огурцов и помидоров', 2, 'Помидор (для готовки)', 360, 'г'),
  ('Салат из огурцов и помидоров', 3, 'Зелень', 20, 'г'),
  ('Салат из огурцов и помидоров', 4, 'Масло растительное', 20, 'мл'),
  ('Салат из огурцов и помидоров', 5, 'Соль', 3, 'г'),
  ('Котлеты', 1, 'Фарш говяжий (сырой)', 600, 'г'), ('Котлеты', 2, 'Хлеб (для готовки)', 60, 'г'),
  ('Котлеты', 3, 'Молоко (для готовки)', 100, 'мл'), ('Котлеты', 4, 'Лук репчатый', 80, 'г'),
  ('Котлеты', 5, 'Яйцо куриное (сырое)', 1, 'шт'), ('Котлеты', 6, 'Масло растительное', 30, 'мл'),
  ('Котлеты', 7, 'Соль', 8, 'г'),
  ('Творожная запеканка', 1, 'Творог 5% (для готовки)', 600, 'г'), ('Творожная запеканка', 2, 'Яйцо куриное (сырое)', 2, 'шт'),
  ('Творожная запеканка', 3, 'Сахар (для готовки)', 60, 'г'), ('Творожная запеканка', 4, 'Сметана 20%', 60, 'г'),
  ('Творожная запеканка', 5, 'Мука пшеничная', 40, 'г'),
  ('Тыквенный суп-пюре', 1, 'Тыква (сырая)', 600, 'г'), ('Тыквенный суп-пюре', 2, 'Картофель (сырой)', 240, 'г'),
  ('Тыквенный суп-пюре', 3, 'Лук репчатый', 80, 'г'), ('Тыквенный суп-пюре', 4, 'Морковь (сырая)', 80, 'г'),
  ('Тыквенный суп-пюре', 5, 'Молоко (для готовки)', 200, 'мл'), ('Тыквенный суп-пюре', 6, 'Соль', 5, 'г'),
  ('Чечевичный суп', 1, 'Чечевица (сухая)', 250, 'г'), ('Чечевичный суп', 2, 'Картофель (сырой)', 240, 'г'),
  ('Чечевичный суп', 3, 'Лук репчатый', 80, 'г'), ('Чечевичный суп', 4, 'Морковь (сырая)', 80, 'г'),
  ('Чечевичный суп', 5, 'Томатная паста', 30, 'г'), ('Чечевичный суп', 6, 'Масло растительное', 20, 'мл'),
  ('Чечевичный суп', 7, 'Лимон', 60, 'г'), ('Чечевичный суп', 8, 'Специи', 5, 'г')
)
insert into public.recipe_ingredients
  (recipe_id, position, food_id, name, amount, unit, kcal, protein, fat, carbs, department)
select ins_r.id, i.position, f.id,
       regexp_replace(f.name, ' \((сыр|сух|для )[^)]*\)$', ''),
       i.amount, i.unit,
       round(f.kcal_100 * g.grams / 100, 1), round(f.protein_100 * g.grams / 100, 1),
       round(f.fat_100 * g.grams / 100, 1), round(f.carbs_100 * g.grams / 100, 1),
       f.department
from i
join ins_r on ins_r.title = i.title
join public.foods f on f.family_id is null and f.name = i.food
cross join lateral (select case when i.unit = 'шт' then i.amount * f.portion_g else i.amount end as grams) g;
