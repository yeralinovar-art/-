-- Этап 7.1: push-напоминания (Web Push, бесплатно).
-- Раз в 15 минут pg_cron зовёт /api/push/tick с секретом; функция push_due решает, кому что
-- напомнить (витамины по расписанию, дела утром, визиты и прививки, вода, мини-тренировка),
-- отмечает отправку в журнале (не повторяем) и отдаёт адреса подписок. Ключ VAPID — только на сервере.

create table public.push_subscriptions (
  endpoint    text primary key check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  user_id     uuid not null references auth.users (id) on delete cascade,
  p256dh      text not null check (char_length(p256dh) <= 200),
  auth        text not null check (char_length(auth) <= 100),
  created_at  timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
create policy "push_subscriptions: свои" on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());
create policy "push_subscriptions: удалить свои" on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());
revoke all on public.push_subscriptions from anon, authenticated;
grant select, delete on public.push_subscriptions to authenticated;

create table public.notification_prefs (
  user_id     uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  meds        boolean not null default true,
  tasks       boolean not null default true,
  visits      boolean not null default true,
  water       boolean not null default false,
  workout     boolean not null default false,
  updated_at  timestamptz not null default now()
);
alter table public.notification_prefs enable row level security;
create policy "notification_prefs: свои" on public.notification_prefs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.notification_prefs from anon;

-- Журнал отправленного: одно напоминание — один раз.
create table public.push_log (
  user_id  uuid not null references auth.users (id) on delete cascade,
  key      text not null,
  sent_at  timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.push_log enable row level security;
revoke all on public.push_log from anon, authenticated;

-- Хэш секрета для планировщика. Сам секрет — только в задании pg_cron.
create table public.app_secrets (
  name  text primary key,
  hash  text not null
);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;

-- Подписка устройства. Если устройство раньше было у другого аккаунта — переносим.
create function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'нужно войти';
  end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.push_subscriptions (endpoint, user_id, p256dh, auth) values (p_endpoint, auth.uid(), p_p256dh, p_auth);
end;
$$;
revoke all on function public.save_push_subscription(text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;

create function public.push_secret_ok(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.app_secrets
    where name = 'push_cron' and hash = encode(extensions.digest(coalesce(p_secret, ''), 'sha256'), 'hex')
  );
$$;
revoke all on function public.push_secret_ok(text) from public, anon, authenticated;

-- Что пора отправить сейчас. Окно — 30 минут: планировщик может опоздать, журнал не даст повторить.
create function public.push_due(p_secret text, p_now timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_local timestamp := p_now at time zone 'Asia/Almaty';
  v_today date := v_local::date;
  v_time time := v_local::time;
  v_from time := greatest(v_local::time - interval '30 minutes', time '00:00');
  v_dow int := extract(isodow from v_local)::int;
  v_result jsonb;
begin
  if not public.push_secret_ok(p_secret) then
    raise exception 'forbidden' using errcode = '28000';
  end if;

  drop table if exists _due, _people;
  create temp table _due (user_id uuid, key text, title text, body text, url text, tag text) on commit drop;

  -- Получатели: у кого есть подписка; настройки по умолчанию, если не сохранены.
  create temp table _people on commit drop as
  select p.id as user_id, p.family_id,
         coalesce(n.meds, true) meds, coalesce(n.tasks, true) tasks, coalesce(n.visits, true) visits,
         coalesce(n.water, false) water, coalesce(n.workout, false) workout
  from public.profiles p
  left join public.notification_prefs n on n.user_id = p.id
  where p.family_id is not null and exists (select 1 from public.push_subscriptions s where s.user_id = p.id);

  -- 1. Витамины и лекарства: в своё время, если ещё не отмечены. Детские — обоим родителям.
  insert into _due
  select pp.user_id, 'med:' || v_today || ':' || slot,
         'Время витаминов · ' || slot,
         string_agg(case when c.name is not null then c.name || ': ' else '' end || m.name || coalesce(' — ' || m.dose, ''), ', ' order by m.name),
         '/meds', 'meds'
  from public.medications m
  cross join lateral unnest(m.times) as slot
  left join public.children c on c.id = m.child_id
  join _people pp on pp.meds and pp.family_id = m.family_id and (m.owner_id = pp.user_id or m.child_id is not null)
  where not m.archived and m.start_date <= v_today and (m.end_date is null or m.end_date >= v_today)
    and (m.weekdays is null or v_dow = any (m.weekdays))
    and slot::time <= v_time and slot::time > v_from
    and not exists (select 1 from public.medication_doses d where d.medication_id = m.id and d.dose_date = v_today and d.slot = slot)
  group by pp.user_id, slot;

  -- 2. Дела на сегодня (и просроченные) — в 9:00.
  if time '09:00' <= v_time and time '09:00' > v_from then
    insert into _due
    select pp.user_id, 'tasks:' || v_today,
           'Дела на сегодня: ' || count(*),
           string_agg(t.title, ', ' order by t.due_date, t.priority desc) filter (where t.rn <= 3)
             || case when count(*) > 3 then ' и ещё ' || (count(*) - 3) else '' end,
           '/tasks', 'tasks'
    from _people pp
    join lateral (
      select t.*, row_number() over (order by t.due_date, t.priority desc) rn
      from public.tasks t
      where t.family_id = pp.family_id and t.status <> 'done' and t.due_date <= v_today
        and ((not t.shared and t.owner_id = pp.user_id) or (t.shared and (t.assignee_id is null or t.assignee_id = pp.user_id)))
    ) t on true
    where pp.tasks
    group by pp.user_id;
  end if;

  -- 3. Визиты к врачу: накануне в 19:00 и в день визита в 8:00. Прививки — накануне.
  if time '19:00' <= v_time and time '19:00' > v_from then
    insert into _due
    select pp.user_id, 'visit:' || v.id || ':eve', 'Завтра: ' || v.title || coalesce(' — ' || c.name, ''),
           concat_ws(', ', case when v.visit_time is not null then 'в ' || v.visit_time end, v.place), '/kids', 'visit-' || v.id
    from public.medical_visits v
    left join public.children c on c.id = v.child_id
    join _people pp on pp.visits and pp.family_id = v.family_id and (v.owner_id = pp.user_id or v.child_id is not null)
    where not v.done and v.visit_date = v_today + 1;

    insert into _due
    select pp.user_id, 'vaccine:' || cv.id || ':eve', 'Завтра прививка: ' || cv.name, c.name, '/kids', 'vaccine-' || cv.id
    from public.child_vaccines cv
    join public.children c on c.id = cv.child_id
    join _people pp on pp.visits and pp.family_id = c.family_id
    where cv.given_on is null and cv.planned_on = v_today + 1;
  end if;
  if time '08:00' <= v_time and time '08:00' > v_from then
    insert into _due
    select pp.user_id, 'visit:' || v.id || ':morn', 'Сегодня: ' || v.title || coalesce(' — ' || c.name, ''),
           concat_ws(', ', case when v.visit_time is not null then 'в ' || v.visit_time end, v.place), '/kids', 'visit-' || v.id
    from public.medical_visits v
    left join public.children c on c.id = v.child_id
    join _people pp on pp.visits and pp.family_id = v.family_id and (v.owner_id = pp.user_id or v.child_id is not null)
    where not v.done and v.visit_date = v_today;
  end if;

  -- 4. Вода в 15:00, если выпито меньше половины нормы.
  if time '15:00' <= v_time and time '15:00' > v_from then
    insert into _due
    select pp.user_id, 'water:' || v_today, 'Стакан воды?',
           'Выпито ' || coalesce(dl.water_ml, 0) || ' из ' || coalesce(h.water_goal_ml, 2000) || ' мл', '/', 'water'
    from _people pp
    left join public.health_profiles h on h.user_id = pp.user_id
    left join public.daily_logs dl on dl.user_id = pp.user_id and dl.log_date = v_today
    where pp.water and coalesce(dl.water_ml, 0) < coalesce(h.water_goal_ml, 2000) / 2;
  end if;

  -- 5. Мини-тренировка в 18:00, если сегодня ещё не отмечена.
  if time '18:00' <= v_time and time '18:00' > v_from then
    insert into _due
    select pp.user_id, 'workout:' || v_today, 'Мини-тренировка дня', '10–15 минут — и серия продолжается', '/workout', 'workout'
    from _people pp
    where pp.workout and not exists (select 1 from public.workout_logs w where w.user_id = pp.user_id and w.log_date = v_today);
  end if;

  -- Только то, что ещё не отправляли.
  with fresh as (
    insert into public.push_log (user_id, key)
    select distinct user_id, key from _due
    on conflict do nothing
    returning user_id, key
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth,
           'title', d.title, 'body', coalesce(d.body, ''), 'url', d.url, 'tag', d.tag)), '[]'::jsonb)
  into v_result
  from fresh f
  join _due d on d.user_id = f.user_id and d.key = f.key
  join public.push_subscriptions s on s.user_id = f.user_id;

  delete from public.push_log where sent_at < p_now - interval '14 days';
  return v_result;
end;
$$;
revoke all on function public.push_due(text, timestamptz) from public;
grant execute on function public.push_due(text, timestamptz) to anon;

-- Подписки, которые браузер отозвал (404/410), удаляем.
create function public.push_drop(p_secret text, p_endpoints text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.push_secret_ok(p_secret) then
    raise exception 'forbidden' using errcode = '28000';
  end if;
  delete from public.push_subscriptions where endpoint = any (p_endpoints);
end;
$$;
revoke all on function public.push_drop(text, text[]) from public;
grant execute on function public.push_drop(text, text[]) to anon;
