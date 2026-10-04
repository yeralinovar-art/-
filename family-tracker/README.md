# Семья — трекер для нас двоих

Мобильное веб-приложение (PWA): общее меню и покупки, личные вес, калории, активность, дела и привычки.
Ставится на экран «Домой» iPhone и Android и открывается как обычное приложение — без App Store.

**Стек:** Next.js 16 (App Router) + TypeScript + Tailwind · Supabase (Postgres, вход, RLS) · Vercel.

## Этапы

| # | Этап | Статус |
|---|------|--------|
| 1 | Основа: вход по email, семья из 2 аккаунтов, PWA, нижнее меню | ✅ готово |
| 2 | Вес и калории, профиль, режим беременности | ⏳ |
| 3 | Меню семьи, рецепты, список покупок | ⏳ |
| 4 | Проекты, таймер, задачи, привычки, общие планы, чтение, цитата и тренировка дня | ⏳ |
| 5 | AI: меню на неделю, калории по тексту и фото | ⏳ |
| 6 | Google Calendar, импорт из Apple Health | ⏳ |
| 7 | Push-напоминания, переключатель темы, офлайн-кэш | ⏳ |

## Что сделано на этапе 1

- Вход и регистрация по email и паролю (пароль, а не ссылка из письма: ссылки на iPhone открываются
  в Safari, а не в установленном приложении).
- «Семья»: первый создаёт семью и получает 6-значный код, второй вводит код. Больше двух человек в
  семью не попасть — это проверяет сама база.
- Профиль: имя, аватар, название семьи, код приглашения с кнопкой «Поделиться».
- Нижнее меню из 5 вкладок (Сегодня, Питание, Меню, Дела, Прогресс), плавающая кнопка «+».
  Общие разделы помечены оранжевой точкой / значком семьи.
- PWA: манифест, иконка, service worker, офлайн-страница. Светлая и тёмная тема — по настройке телефона.
- Время и даты — по Алматы (UTC+5).
- База: таблицы `families` и `profiles` с RLS. Партнёр видит только ваше имя и аватар.

---

## Что нужно сделать вам (один раз)

### 1. Supabase — база данных и вход

1. Зарегистрируйтесь на [supabase.com](https://supabase.com) (можно через GitHub) и нажмите
   **New project**. Регион — ближайший (например, Frankfurt). Придумайте пароль базы и сохраните его.
2. Когда проект создастся, откройте **SQL Editor → New query**, вставьте целиком содержимое файла
   [`supabase/migrations/20260930000001_foundation.sql`](supabase/migrations/20260930000001_foundation.sql)
   и нажмите **Run**. Должно появиться «Success».
3. Откройте **Authentication → URL Configuration**:
   - **Site URL** — адрес сайта на Vercel (появится в шаге 2 ниже), например `https://semya.vercel.app`.
   - **Redirect URLs** — добавьте `https://semya.vercel.app/auth/confirm` и `http://localhost:3000/auth/confirm`.
4. Ключи: нажмите **Connect** вверху страницы проекта (или **Project Settings → API Keys**) и
   скопируйте **Project URL** и **Publishable key** (`sb_publishable_…`; в старых проектах — `anon public`).
   Секретный ключ (`service_role` / `sb_secret_…`) никуда не вставляйте.
5. Необязательно: чтобы не ждать письма при регистрации, выключите
   **Authentication → Sign In / Providers → Email → Confirm email**.

### 2. Vercel — хостинг

1. Зайдите на [vercel.com](https://vercel.com) через GitHub → **Add New → Project** → выберите этот репозиторий.
2. **Root Directory** — укажите `family-tracker` (важно: в корне репозитория лежит другой сайт).
3. В **Environment Variables** добавьте:
   - `NEXT_PUBLIC_SUPABASE_URL` — Project URL из Supabase
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Publishable key
   - `NEXT_PUBLIC_SITE_URL` — адрес сайта на Vercel (можно добавить после первого деплоя и нажать Redeploy)
4. Нажмите **Deploy**. Через пару минут появится адрес вида `https://….vercel.app` —
   впишите его в Supabase (шаг 1.3).

Дальше каждый push в GitHub деплоится автоматически.

### 3. Регистрация и семья

1. Откройте адрес сайта на телефоне → **Регистрация** → имя, email, пароль.
2. Нажмите **Создать семью** → в профиле появится код из 6 символов → **Поделиться** → отправьте мужу.
3. Муж регистрируется и вводит код в блоке «У партнёра уже есть семья».
4. Когда оба зарегистрированы, закройте регистрацию для чужих:
   **Supabase → Authentication → Sign In / Providers → Allow new users to sign up → выключить**.

### 4. Установка на телефон

- **iPhone:** откройте сайт в **Safari** → кнопка «Поделиться» → **На экран „Домой“** → **Добавить**.
- **Android:** Chrome → меню ⋮ → **Установить приложение**.

---

## Для разработчика

### Локальный запуск

```bash
cd family-tracker
npm install
cp .env.example .env.local   # вписать URL и ключ Supabase
npm run dev                  # http://localhost:3000
```

Можно работать с локальным Supabase (нужен Docker):

```bash
npx supabase start           # поднимет базу и применит миграции из supabase/migrations
npx supabase status          # покажет API URL и publishable key для .env.local
```

Проверки: `npm run lint`, `npx tsc --noEmit`, `npm run build`.

### Переменные окружения

| Переменная | Где используется | Секретная? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | браузер и сервер | нет |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (или `NEXT_PUBLIC_SUPABASE_ANON_KEY`) | браузер и сервер | нет — доступ ограничивает RLS |
| `NEXT_PUBLIC_SITE_URL` | ссылки в письмах | нет |
| `ANTHROPIC_API_KEY`, `GOOGLE_*`, `VAPID_PRIVATE_KEY` | появятся на этапах 5–7, только сервер | **да** |

### Миграции

Файлы в `supabase/migrations/` применяются по порядку: через SQL Editor (вставить и Run) или
`npx supabase link --project-ref <ref> && npx supabase db push`.

Правило доступа для всех таблиц:

- **личные** (вес, калории, задачи…) — `user_id = auth.uid()`, видит только владелец;
- **общие** (меню, рецепты, покупки, общие задачи и планы) — `family_id = public.my_family_id()`, видят оба.

### Структура

```
src/
  proxy.ts                 обновление сессии, редирект на /login (в Next 16 middleware называется proxy)
  app/
    (app)/                 экраны с нижним меню: Сегодня, Питание, Меню, Дела, Прогресс, Профиль
    login/                 вход и регистрация
    onboarding/            создать семью / вступить по коду
    auth/confirm/          ссылка из письма подтверждения
    manifest.ts, icons/    PWA-манифест и иконки
  components/              нижнее меню, кнопка «+», общие UI-элементы
  lib/                     Supabase-клиенты, сессия, время по Алматы
public/sw.js               service worker
supabase/                  config.toml и миграции
```
