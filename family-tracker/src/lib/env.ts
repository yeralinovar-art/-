// Публичные ключи Supabase. Они безопасны для браузера: доступ к данным
// ограничивают RLS-политики в базе. Секретные ключи (Claude, service role)
// читаются только на сервере и сюда не попадают.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);
