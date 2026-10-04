import { NextResponse, type NextRequest } from "next/server";
import { FOOD_COLUMNS, toFood } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

// Поиск по справочнику: общие продукты + блюда семьи (фильтрует RLS).
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 60);
  let query = supabase.from("foods").select(FOOD_COLUMNS).order("name").limit(40);
  if (q) {
    // Экранируем спецсимволы LIKE и ищем по каждому слову.
    for (const word of q.split(/\s+/).slice(0, 4)) {
      query = query.ilike("name", `%${word.replace(/[%_\\]/g, (c) => `\\${c}`)}%`);
    }
  }
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Свои блюда семьи — выше общих.
  const foods = (data ?? []).map(toFood).sort((a, b) => Number(b.family_id !== null) - Number(a.family_id !== null));
  return NextResponse.json({ foods });
}
