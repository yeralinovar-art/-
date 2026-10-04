-- Этап 4.3: цитата дня, мини-тренировка дня (видно партнёру), активность и шаги (личное).

-- ---------------------------------------------------------------------------
-- Цитаты: общая база (family_id is null) + свои цитаты семьи
-- ---------------------------------------------------------------------------

create table public.quotes (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid references public.families (id) on delete cascade,
  -- Порядок в общей базе: цитата дня = номер дня по кругу.
  ord         int,
  text        text not null check (char_length(text) between 3 and 400),
  author      text check (char_length(author) <= 80),
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  check ((family_id is null) = (ord is not null))
);

create index quotes_family_idx on public.quotes (family_id);

create table public.quote_favorites (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  quote_id   uuid not null references public.quotes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, quote_id)
);

-- ---------------------------------------------------------------------------
-- Мини-тренировка дня: отметки видны семье (общая серия)
-- ---------------------------------------------------------------------------

create table public.workout_logs (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null default public.my_family_id() references public.families (id) on delete cascade,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  log_date     date not null,
  workout_key  text not null check (char_length(workout_key) <= 40),
  version      text not null check (version in ('regular', 'pregnancy')),
  -- skipped — «плохо себя чувствую»: серия не прерывается.
  status       text not null check (status in ('done', 'skipped')),
  minutes      smallint check (minutes between 1 and 120),
  kcal         smallint check (kcal between 0 and 2000),
  created_at   timestamptz not null default now(),
  unique (user_id, log_date)
);

create index workout_logs_family_date_idx on public.workout_logs (family_id, log_date);

-- ---------------------------------------------------------------------------
-- Активность (личное): тренировки и шаги
-- ---------------------------------------------------------------------------

create table public.activities (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  act_date        date not null,
  kind            text not null check (kind in ('walk', 'run', 'gym', 'yoga', 'swim', 'bike', 'dance', 'mini', 'other')),
  minutes         smallint not null check (minutes between 1 and 600),
  kcal            smallint not null default 0 check (kcal between 0 and 5000),
  note            text check (char_length(note) <= 200),
  source          text not null default 'manual' check (source in ('manual', 'mini', 'health')),
  workout_log_id  uuid references public.workout_logs (id) on delete cascade,
  created_at      timestamptz not null default now()
);

create index activities_user_date_idx on public.activities (user_id, act_date);

create table public.daily_steps (
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  step_date    date not null,
  steps        int not null default 0 check (steps between 0 and 200000),
  active_kcal  smallint check (active_kcal between 0 and 10000),
  source       text not null default 'manual' check (source in ('manual', 'health')),
  updated_at   timestamptz not null default now(),
  primary key (user_id, step_date)
);

-- Цели активности.
alter table public.health_profiles
  add column steps_goal int not null default 8000 check (steps_goal between 1000 and 50000),
  add column workouts_week_goal smallint not null default 3 check (workouts_week_goal between 1 and 14);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.quotes enable row level security;
alter table public.quote_favorites enable row level security;
alter table public.workout_logs enable row level security;
alter table public.activities enable row level security;
alter table public.daily_steps enable row level security;

create policy "quotes: общие и своей семьи" on public.quotes
  for select to authenticated using (family_id is null or family_id = public.my_family_id());
create policy "quotes: добавляю в семью" on public.quotes
  for insert to authenticated with check (family_id = public.my_family_id() and ord is null);
create policy "quotes: удаляю свои семейные" on public.quotes
  for delete to authenticated using (family_id = public.my_family_id());

create policy "quote_favorites: свои" on public.quote_favorites
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.quotes q where q.id = quote_id));

create policy "workout_logs: семья видит" on public.workout_logs
  for select to authenticated using (family_id = public.my_family_id());
create policy "workout_logs: свои отмечаю" on public.workout_logs
  for insert to authenticated with check (user_id = auth.uid() and family_id = public.my_family_id());
create policy "workout_logs: свои меняю" on public.workout_logs
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and family_id = public.my_family_id());
create policy "workout_logs: свои удаляю" on public.workout_logs
  for delete to authenticated using (user_id = auth.uid());

create policy "activities: свои" on public.activities
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (workout_log_id is null or exists (select 1 from public.workout_logs w where w.id = workout_log_id and w.user_id = auth.uid()))
  );
create policy "daily_steps: свои" on public.daily_steps
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.quotes, public.quote_favorites, public.workout_logs, public.activities, public.daily_steps from anon;

-- Стартовая база цитат и пословиц (порядок перемешан, чтобы авторы и пословицы чередовались).
insert into public.quotes (ord, text, author) values
  (1, 'Семь раз отмерь, один раз отрежь.', 'Русская пословица'),
  (2, 'Друзья познаются в беде.', 'Русская пословица'),
  (3, 'Учиться и время от времени повторять изученное — разве это не приятно?', 'Конфуций'),
  (4, 'Где единство, там и жизнь.', 'Казахская пословица'),
  (5, 'Начало благополучия — согласие.', 'Казахская пословица'),
  (6, 'В тесноте, да не в обиде.', 'Русская пословица'),
  (7, 'Сам погибай, а товарища выручай.', 'Русская пословица'),
  (8, 'Ты навсегда в ответе за всех, кого приручил.', 'Антуан де Сент-Экзюпери'),
  (9, 'Хлеб — всему голова.', 'Русская пословица'),
  (10, 'Учиться никогда не поздно.', 'Русская пословица'),
  (11, 'Дома и стены помогают.', 'Русская пословица'),
  (12, 'Капля камень точит.', 'Русская пословица'),
  (13, 'Родной край — золотая колыбель.', 'Казахская пословица'),
  (14, 'Где нет согласия, там нет и достатка.', 'Казахская пословица'),
  (15, 'Знание — неисчерпаемый клад, ум — неиссякаемый родник.', 'Казахская пословица'),
  (16, 'Мы все учились понемногу чему-нибудь и как-нибудь.', 'Александр Пушкин'),
  (17, 'Всякому овощу своё время.', 'Русская пословица'),
  (18, 'Птицу узнают по полёту, а человека — по работе.', 'Русская пословица'),
  (19, 'Готовь сани летом, а телегу зимой.', 'Русская пословица'),
  (20, 'Не гордись, пока не постиг науки.', 'Абай Кунанбаев'),
  (21, 'Жизнь — как езда на велосипеде. Чтобы сохранить равновесие, нужно двигаться.', 'Альберт Эйнштейн'),
  (22, 'Родина дороже огня.', 'Казахская пословица'),
  (23, 'В человеке должно быть всё прекрасно: и лицо, и одежда, и душа, и мысли.', 'Антон Чехов'),
  (24, 'Здоровье — большое богатство.', 'Казахская пословица'),
  (25, 'Краткость — сестра таланта.', 'Антон Чехов'),
  (26, 'Любить — это не значит смотреть друг на друга, любить — значит вместе смотреть в одном направлении.', 'Антуан де Сент-Экзюпери'),
  (27, 'Всё хорошо, что хорошо кончается.', 'Русская пословица'),
  (28, 'Не имей сто рублей, а имей сто друзей.', 'Русская пословица'),
  (29, 'Будет и на нашей улице праздник.', 'Русская пословица'),
  (30, 'Пока мы откладываем жизнь, она проходит.', 'Сенека'),
  (31, 'Меньше говори — больше услышишь.', 'Казахская пословица'),
  (32, 'Корень учения горек, да плод его сладок.', 'Русская пословица'),
  (33, 'Уча, мы учимся.', 'Сенека'),
  (34, 'Сделал дело — гуляй смело.', 'Русская пословица'),
  (35, 'Не события тревожат людей, а их мнения о событиях.', 'Эпиктет'),
  (36, 'Ум за морем не купишь.', 'Русская пословица'),
  (37, 'Дорогу осилит идущий.', 'Русская пословица'),
  (38, 'Сильный победит одного, знающий — тысячу.', 'Казахская пословица'),
  (39, 'Трудись не ленясь — будешь сыт, не прося.', 'Казахская пословица'),
  (40, 'Что посеешь, то и пожнёшь.', 'Русская пословица'),
  (41, 'Мир да лад — большой клад.', 'Русская пословица'),
  (42, 'Не место красит человека, а человек место.', 'Русская пословица'),
  (43, 'Доброе слово — половина счастья.', 'Казахская пословица'),
  (44, 'То, что меня не убивает, делает меня сильнее.', 'Фридрих Ницше'),
  (45, 'Если звёзды зажигают — значит — это кому-нибудь нужно?', 'Владимир Маяковский'),
  (46, 'Мал золотник, да дорог.', 'Русская пословица'),
  (47, 'Ученье — свет, а неученье — тьма.', 'Русская пословица'),
  (48, 'Глаза боятся, а руки делают.', 'Русская пословица'),
  (49, 'Каков мастер, такова и работа.', 'Русская пословица'),
  (50, 'Лиха беда начало.', 'Русская пословица'),
  (51, 'Дорога ложка к обеду.', 'Русская пословица'),
  (52, 'Сколько живёшь, столько и учись жить.', 'Сенека'),
  (53, 'Рукописи не горят.', 'Михаил Булгаков'),
  (54, 'Делай что должно, и будь что будет.', 'Старинное изречение'),
  (55, 'Кто ищет, тот всегда найдёт.', 'Русская пословица'),
  (56, 'Счастливые часов не наблюдают.', 'Александр Грибоедов'),
  (57, 'Кто не знает, в какую гавань плывёт, для того нет попутного ветра.', 'Сенека'),
  (58, 'Хочешь быть счастливым — будь им.', 'Козьма Прутков'),
  (59, 'Зри в корень!', 'Козьма Прутков'),
  (60, 'Не в деньгах счастье.', 'Русская пословица'),
  (61, 'Привычка свыше нам дана: замена счастию она.', 'Александр Пушкин'),
  (62, 'При солнышке тепло, при матери добро.', 'Русская пословица'),
  (63, 'Москва не сразу строилась.', 'Русская пословица'),
  (64, 'Благородный муж предъявляет требования к себе, низкий человек — к другим.', 'Конфуций'),
  (65, 'Тише едешь — дальше будешь.', 'Русская пословица'),
  (66, 'Зорко одно лишь сердце. Самого главного глазами не увидишь.', 'Антуан де Сент-Экзюпери'),
  (67, 'Доброе слово и кошке приятно.', 'Русская пословица'),
  (68, 'Аппетит приходит во время еды.', 'Русская пословица'),
  (69, 'Без труда не выловишь и рыбку из пруда.', 'Русская пословица'),
  (70, 'Слово — серебро, молчание — золото.', 'Русская пословица'),
  (71, 'Человек — существо общественное.', 'Аристотель'),
  (72, 'Не боги горшки обжигают.', 'Русская пословица'),
  (73, 'Жизнь наша есть то, что мы думаем о ней.', 'Марк Аврелий'),
  (74, 'Терпение — чистое золото.', 'Казахская пословица'),
  (75, 'Лучше поздно, чем никогда.', 'Русская пословица'),
  (76, 'Утро вечера мудренее.', 'Русская пословица'),
  (77, 'Делу время, потехе час.', 'Русская пословица'),
  (78, 'Никогда и ничего не просите! Никогда и ничего, и в особенности у тех, кто сильнее вас. Сами предложат и сами всё дадут!', 'Михаил Булгаков'),
  (79, 'Где хотенье, там и уменье.', 'Русская пословица'),
  (80, 'Беда, коль пироги начнёт печи сапожник, а сапоги тачать пирожник.', 'Иван Крылов'),
  (81, 'Отец — высокая гора, мать — медовый родник.', 'Казахская пословица'),
  (82, 'Согласие да лад — в семье клад.', 'Русская пословица'),
  (83, 'Знающий людей — разумен. Знающий себя — просветлён.', 'Лао-цзы'),
  (84, 'Мир не без добрых людей.', 'Русская пословица'),
  (85, 'Я знаю, что ничего не знаю.', 'Сократ'),
  (86, 'Терпение и труд всё перетрут.', 'Русская пословица'),
  (87, 'Лучшее — враг хорошего.', 'Вольтер'),
  (88, 'Жизнь коротка, искусство вечно.', 'Гиппократ'),
  (89, 'Век живи — век учись.', 'Русская пословица'),
  (90, 'Путь в тысячу ли начинается с первого шага.', 'Лао-цзы'),
  (91, 'Красота спасёт мир.', 'Фёдор Достоевский'),
  (92, 'Кто рано встаёт, тому Бог подаёт.', 'Русская пословица'),
  (93, 'Без отдыха и конь не скачет.', 'Русская пословица'),
  (94, 'Взялся за гуж — не говори, что не дюж.', 'Русская пословица'),
  (95, 'Вся семья вместе, так и душа на месте.', 'Русская пословица'),
  (96, 'Нет худа без добра.', 'Русская пословица'),
  (97, 'Хорошее начало — половина дела.', 'Русская пословица'),
  (98, 'Повторенье — мать ученья.', 'Русская пословица'),
  (99, 'На ошибках учатся.', 'Русская пословица'),
  (100, 'Не спеши языком, торопись делом.', 'Русская пословица'),
  (101, 'Здоровье дороже богатства.', 'Русская пословица'),
  (102, 'Никто не обнимет необъятного.', 'Козьма Прутков'),
  (103, 'Недостаточно знать, надо и применять. Недостаточно хотеть, надо и делать.', 'Иоганн Вольфганг Гёте'),
  (104, 'Любишь кататься — люби и саночки возить.', 'Русская пословица'),
  (105, 'Ум хорошо, а два лучше.', 'Русская пословица'),
  (106, 'Один в поле не воин.', 'Русская пословица'),
  (107, 'Под лежачий камень вода не течёт.', 'Русская пословица'),
  (108, 'Время — деньги.', 'Бенджамин Франклин');
