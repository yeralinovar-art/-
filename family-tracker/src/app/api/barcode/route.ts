import { NextResponse, type NextRequest } from "next/server";
import { FOOD_COLUMNS, toFood } from "@/lib/data";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

type OffProduct = {
  product_name?: string;
  product_name_ru?: string;
  brands?: string;
  nutriments?: Record<string, number | string | undefined>;
};

// Продукт по штрихкоду: сначала свой справочник, потом Open Food Facts.
// Найденное в Open Food Facts сохраняется в справочник семьи.
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.family) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const code = (request.nextUrl.searchParams.get("code") ?? "").replace(/\D/g, "");
  if (code.length < 6 || code.length > 14) {
    return NextResponse.json({ error: "Штрихкод — от 6 до 14 цифр" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: own } = await supabase.from("foods").select(FOOD_COLUMNS).eq("barcode", code).limit(1).maybeSingle();
  if (own) return NextResponse.json({ food: toFood(own), source: "own" });

  let product: OffProduct | undefined;
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,product_name_ru,brands,nutriments`,
      {
        headers: { "User-Agent": "Semya family tracker - https://semya-one.vercel.app" },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (res.ok) product = (await res.json())?.product;
  } catch {
    return NextResponse.json({ error: "Open Food Facts не отвечает. Попробуйте ещё раз или введите вручную." }, { status: 502 });
  }

  const n = product?.nutriments ?? {};
  const val = (key: string) => {
    const v = Number(n[`${key}_100g`]);
    return Number.isFinite(v) && v >= 0 ? Math.round(v * 10) / 10 : null;
  };
  const kcal = val("energy-kcal") ?? (val("energy") !== null ? Math.round((val("energy") as number) / 4.184) : null);
  const name = (product?.product_name_ru || product?.product_name || "").trim();
  if (!product || !name || kcal === null) {
    return NextResponse.json({ error: "Продукт не найден. Добавьте его как своё блюдо." }, { status: 404 });
  }

  const caffeine = val("caffeine");
  const { data: saved, error } = await supabase
    .from("foods")
    .insert({
      family_id: session.family.id,
      created_by: session.userId,
      name: name.slice(0, 120),
      brand: product.brands?.split(",")[0]?.trim().slice(0, 80) || null,
      barcode: code,
      kcal_100: Math.min(kcal, 950),
      protein_100: Math.min(val("proteins") ?? 0, 100),
      fat_100: Math.min(val("fat") ?? 0, 100),
      carbs_100: Math.min(val("carbohydrates") ?? 0, 100),
      // Open Food Facts хранит кофеин в граммах.
      caffeine_100: caffeine ? Math.min(caffeine * 1000, 1000) : 0,
    })
    .select(FOOD_COLUMNS)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ food: toFood(saved), source: "openfoodfacts" });
}
