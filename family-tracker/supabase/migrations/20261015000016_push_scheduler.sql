-- Этап 7.1: планировщик напоминаний. pg_cron раз в 15 минут вызывает /api/push/tick через pg_net.
-- Само задание с секретом создаётся отдельной командой (см. README → «Push-напоминания»),
-- чтобы секрет не попал в репозиторий.
create extension if not exists pg_cron;
create extension if not exists pg_net;
