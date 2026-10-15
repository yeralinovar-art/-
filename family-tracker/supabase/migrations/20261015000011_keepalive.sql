-- Ежедневный «пинг» базы (cron на Vercel), чтобы бесплатный проект Supabase
-- не уходил на паузу после 7 дней без запросов. Функция ничего не читает и не меняет.

create function public.keepalive()
returns int
language sql
stable
set search_path = ''
as $$ select 1 $$;

revoke all on function public.keepalive() from public;
grant execute on function public.keepalive() to anon, authenticated;
