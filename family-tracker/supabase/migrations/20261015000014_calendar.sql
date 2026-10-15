-- Этап 6.2: календарь без Google Cloud.
-- 1) Экспорт: секретная ссылка-подписка (ICS) — дела со сроком, визиты к врачу, прививки, планы
--    появляются в Google/iPhone-календаре. В базе только хэш ключа; события собирает функция
--    calendar_feed с теми же правилами видимости, что и RLS.
-- 2) Импорт: секретный iCal-адрес своего Google-календаря — события дня на «Сегодня».

create table public.calendar_links (
  user_id          uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  feed_token_hash  text unique,
  import_url       text check (import_url ~ '^https://' and char_length(import_url) <= 1000),
  created_at       timestamptz not null default now(),
  last_feed_at     timestamptz
);

alter table public.calendar_links enable row level security;
create policy "calendar_links: свой" on public.calendar_links
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.calendar_links from anon, authenticated;
grant select, delete on public.calendar_links to authenticated;
grant insert (import_url), update (import_url) on public.calendar_links to authenticated;

-- Новая ссылка-подписка (старая перестаёт работать). Ключ возвращается один раз.
create function public.create_calendar_feed_token()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  if auth.uid() is null then
    raise exception 'нужно войти';
  end if;
  insert into public.calendar_links (user_id, feed_token_hash)
  values (auth.uid(), encode(extensions.digest(v_token, 'sha256'), 'hex'))
  on conflict (user_id) do update set feed_token_hash = excluded.feed_token_hash, last_feed_at = null;
  return v_token;
end;
$$;

revoke all on function public.create_calendar_feed_token() from public, anon;
grant execute on function public.create_calendar_feed_token() to authenticated;

-- События для подписки: месяц назад — год вперёд, только незавершённое.
-- Видимость как в RLS: свои и общие дела, свои и детские визиты, семейные прививки и планы.
create function public.calendar_feed(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_family uuid;
  v_from date := (now() at time zone 'Asia/Almaty')::date - 30;
  v_to date := (now() at time zone 'Asia/Almaty')::date + 365;
  v_events jsonb;
begin
  select user_id into v_user from public.calendar_links
  where feed_token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if v_user is null then
    raise exception 'invalid token' using errcode = '28000';
  end if;
  select family_id into v_family from public.profiles where id = v_user;

  select coalesce(jsonb_agg(e order by e ->> 'date'), '[]'::jsonb) into v_events from (
    select jsonb_build_object('uid', 'task-' || t.id, 'kind', 'task', 'date', t.due_date, 'title', t.title,
                              'note', t.note, 'shared', t.shared) e
    from public.tasks t
    where t.family_id = v_family and (t.shared or t.owner_id = v_user)
      and t.status <> 'done' and t.due_date between v_from and v_to
    union all
    select jsonb_build_object('uid', 'visit-' || v.id, 'kind', 'visit', 'date', v.visit_date, 'time', v.visit_time,
                              'title', v.title, 'place', v.place, 'note', v.questions, 'child', c.name)
    from public.medical_visits v
    left join public.children c on c.id = v.child_id
    where v.family_id = v_family and (v.owner_id = v_user or v.child_id is not null)
      and not v.done and v.visit_date between v_from and v_to
    union all
    select jsonb_build_object('uid', 'vaccine-' || cv.id, 'kind', 'vaccine', 'date', cv.planned_on,
                              'title', cv.name, 'child', c.name, 'note', cv.note)
    from public.child_vaccines cv
    join public.children c on c.id = cv.child_id
    where c.family_id = v_family and cv.given_on is null and cv.planned_on between v_from and v_to
    union all
    select jsonb_build_object('uid', 'plan-' || p.id, 'kind', 'plan', 'date', p.target_date,
                              'title', p.title, 'note', p.note, 'emoji', p.emoji)
    from public.plans p
    where p.family_id = v_family and not p.done and p.target_date between v_from and v_to
    limit 1000
  ) s;

  update public.calendar_links set last_feed_at = now() where user_id = v_user;
  return v_events;
end;
$$;

revoke all on function public.calendar_feed(text) from public;
grant execute on function public.calendar_feed(text) to anon, authenticated;
