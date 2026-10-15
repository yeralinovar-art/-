import { createClient } from "@supabase/supabase-js";
import { buildIcs, type FeedEvent } from "@/lib/calendar";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/env";

// Секретная ссылка-подписка: /api/calendar/<ключ>.ics. Google и iPhone забирают её сами,
// раз в несколько часов. Ключ — личный; в базе только его хэш.

export async function GET(request: Request, ctx: RouteContext<"/api/calendar/[file]">) {
  const { file } = await ctx.params;
  const token = file.replace(/\.ics$/i, "");
  if (!/^[0-9a-f]{48}$/.test(token)) return new Response("Not found", { status: 404 });

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc("calendar_feed", { p_token: token });
  if (error) {
    if (error.code === "28000") return new Response("Not found", { status: 404 });
    console.error("calendar feed", error.code, error.message);
    return new Response("Error", { status: 500 });
  }
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? new URL(request.url).origin;
  const ics = buildIcs((data ?? []) as FeedEvent[], { name: "Семья", url: `${origin}/tasks` });
  return new Response(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="semya.ics"',
      "cache-control": "private, no-store",
    },
  });
}
