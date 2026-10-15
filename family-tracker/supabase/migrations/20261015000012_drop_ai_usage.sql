-- AI убран из приложения (платный API) — таблица учёта запросов больше не нужна.
drop table if exists public.ai_usage;
