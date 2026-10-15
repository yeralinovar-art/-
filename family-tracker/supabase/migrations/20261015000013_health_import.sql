-- Этап 6.1: импорт из Apple Health через iOS «Команды».
-- Команда раз в день отправляет шаги, активные ккал, вес и тренировки на /api/health-import
-- с личным ключом. В базе хранится только хэш ключа; запись идёт через функцию,
-- которая сама находит владельца ключа (без серверного ключа Supabase).

create table public.health_tokens (
  user_id         uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  token_hash      text not null unique,
  created_at      timestamptz not null default now(),
  last_import_at  timestamptz,
  last_summary    text check (char_length(last_summary) <= 300)
);

alter table public.health_tokens enable row level security;
create policy "health_tokens: свой" on public.health_tokens
  for select to authenticated using (user_id = auth.uid());
create policy "health_tokens: удалить свой" on public.health_tokens
  for delete to authenticated using (user_id = auth.uid());
revoke insert, update on public.health_tokens from authenticated;
revoke all on public.health_tokens from anon;

-- Тренировки из «Здоровья» не дублируются при повторной отправке.
alter table public.activities add column external_id text check (char_length(external_id) <= 120);
create unique index activities_user_external_idx on public.activities (user_id, external_id) where external_id is not null;

-- Новый ключ (старый перестаёт работать). Возвращается один раз — в базе только хэш.
create function public.create_health_token()
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
  insert into public.health_tokens (user_id, token_hash)
  values (auth.uid(), encode(extensions.digest(v_token, 'sha256'), 'hex'))
  on conflict (user_id) do update
    set token_hash = excluded.token_hash, created_at = now(), last_import_at = null, last_summary = null;
  return v_token;
end;
$$;

revoke all on function public.create_health_token() from public, anon;
grant execute on function public.create_health_token() to authenticated;

-- Приём данных по ключу. Повторный импорт за тот же день обновляет, а не дублирует:
-- шаги и вес — одна запись на день, тренировки — по external_id.
create function public.health_import(p_token text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_date date := coalesce((p_payload ->> 'date')::date, (now() at time zone 'Asia/Almaty')::date);
  v_steps int := (p_payload ->> 'steps')::int;
  v_active int := (p_payload ->> 'active_kcal')::int;
  v_weight numeric := (p_payload ->> 'weight_kg')::numeric;
  v_workout jsonb;
  v_workouts int := 0;
  v_summary text;
begin
  select user_id into v_user from public.health_tokens
  where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if v_user is null then
    raise exception 'invalid token' using errcode = '28000';
  end if;
  if v_date > (now() at time zone 'Asia/Almaty')::date + 1 or v_date < (now() at time zone 'Asia/Almaty')::date - 31 then
    raise exception 'date out of range' using errcode = '22008';
  end if;

  if v_steps is not null or v_active is not null then
    insert into public.daily_steps (user_id, step_date, steps, active_kcal, source, updated_at)
    values (v_user, v_date, greatest(0, least(coalesce(v_steps, 0), 200000)),
            case when v_active is null then null else greatest(0, least(v_active, 10000)) end, 'health', now())
    on conflict (user_id, step_date) do update set
      steps = case when v_steps is null then public.daily_steps.steps else excluded.steps end,
      active_kcal = coalesce(excluded.active_kcal, public.daily_steps.active_kcal),
      source = 'health',
      updated_at = now();
  end if;

  if v_weight is not null and v_weight between 30 and 300 then
    insert into public.weight_entries (user_id, entry_date, weight_kg, note)
    values (v_user, v_date, round(v_weight, 1), 'из «Здоровья»')
    on conflict (user_id, entry_date) do update set weight_kg = excluded.weight_kg;
  end if;

  for v_workout in select * from jsonb_array_elements(coalesce(p_payload -> 'workouts', '[]'::jsonb)) limit 20 loop
    if (v_workout ->> 'minutes') is null or (v_workout ->> 'minutes')::numeric < 1 then
      continue;
    end if;
    insert into public.activities (user_id, act_date, kind, minutes, kcal, note, source, external_id)
    values (
      v_user,
      v_date,
      coalesce(nullif(v_workout ->> 'kind', ''), 'other'),
      least(600, round((v_workout ->> 'minutes')::numeric)),
      greatest(0, least(5000, round(coalesce((v_workout ->> 'kcal')::numeric, 0)))),
      left(nullif(v_workout ->> 'name', ''), 200),
      'health',
      left(v_workout ->> 'external_id', 120)
    )
    on conflict (user_id, external_id) where external_id is not null do update set
      minutes = excluded.minutes, kcal = excluded.kcal, kind = excluded.kind, note = excluded.note;
    v_workouts := v_workouts + 1;
  end loop;

  v_summary := concat_ws(', ',
    case when v_steps is not null then v_steps || ' шагов' end,
    case when v_active is not null then v_active || ' акт. ккал' end,
    case when v_weight is not null then round(v_weight, 1) || ' кг' end,
    case when v_workouts > 0 then v_workouts || ' трен.' end);
  update public.health_tokens set last_import_at = now(), last_summary = left(coalesce(nullif(v_summary, ''), 'пусто'), 300)
  where user_id = v_user;

  return jsonb_build_object('ok', true, 'date', v_date, 'summary', v_summary);
end;
$$;

revoke all on function public.health_import(text, jsonb) from public;
grant execute on function public.health_import(text, jsonb) to anon, authenticated;
