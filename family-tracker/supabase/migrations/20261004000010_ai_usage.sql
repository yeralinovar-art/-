-- Этап 5: учёт обращений к AI — дневные лимиты на человека, чтобы счёт за API не вырос случайно.

create table public.ai_usage (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('food_text', 'food_photo', 'menu', 'swap')),
  input_tokens  int,
  output_tokens int,
  created_at  timestamptz not null default now()
);

create index ai_usage_user_created_idx on public.ai_usage (user_id, created_at);

alter table public.ai_usage enable row level security;

create policy "ai_usage: свои читаю" on public.ai_usage
  for select to authenticated using (user_id = auth.uid());
create policy "ai_usage: свои записываю" on public.ai_usage
  for insert to authenticated with check (user_id = auth.uid());

-- Удалять и менять записи нельзя — иначе лимит можно обнулить.
revoke update, delete on public.ai_usage from authenticated;
revoke all on public.ai_usage from anon;
