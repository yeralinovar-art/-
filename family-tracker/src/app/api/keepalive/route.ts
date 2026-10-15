import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/env";

// Раз в день Vercel Cron дёргает этот адрес: один лёгкий запрос в базу,
// чтобы бесплатный проект Supabase не ставился на паузу из-за «неактивности».
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const { error } = await supabase.rpc("keepalive");
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
