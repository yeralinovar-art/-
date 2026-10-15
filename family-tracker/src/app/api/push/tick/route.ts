import { createClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/env";
import { sendPushes, type PushMessage, type PushTarget } from "@/lib/push";

// Планировщик (pg_cron в Supabase) зовёт этот адрес раз в 15 минут с секретом.
// База сама проверяет секрет, решает, что пора напомнить, и не даёт отправить дважды.

export async function POST(request: Request) {
  const secret = request.headers.get("x-push-secret") ?? "";
  if (!secret) return Response.json({ ok: false }, { status: 401 });
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data, error } = await supabase.rpc("push_due", { p_secret: secret });
  if (error) {
    if (error.code === "28000") return Response.json({ ok: false }, { status: 401 });
    console.error("push_due", error.code, error.message);
    return Response.json({ ok: false }, { status: 500 });
  }
  const items = (data ?? []) as (PushTarget & PushMessage)[];
  if (!items.length) return Response.json({ ok: true, sent: 0 });

  const result = await sendPushes(items);
  if (result.gone.length) await supabase.rpc("push_drop", { p_secret: secret, p_endpoints: result.gone });
  return Response.json({ ok: true, ...result });
}
