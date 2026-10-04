import { NextResponse, type NextRequest } from "next/server";
import { FOOD_COLUMNS, toFood } from "@/lib/data";
import { foodSearchPatterns, rankFoods } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";

// Поиск по справочнику: общие продукты + блюда семьи (фильтрует RLS).
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 60);
  let query = supabase.from("foods").select(FOOD_COLUMNS).order("name").limit(60);
  // Каждое слово — отдельное условие (И): «кофе молоко» найдёт «Кофе с молоком».
  for (const pattern of foodSearchPatterns(q)) query = query.filter("name", "imatch", pattern);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ foods: rankFoods((data ?? []).map(toFood), q).slice(0, 40) });
}
