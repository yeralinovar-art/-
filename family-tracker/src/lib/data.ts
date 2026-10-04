import "server-only";
import { cache } from "react";
import { DEFAULT_HEALTH_PROFILE, type HealthProfile, type WeightPoint } from "@/lib/health";
import { createClient } from "@/lib/supabase/server";

// Чтение личных данных. Доступ ограничивает RLS: запросы видят только строки владельца.

export const MEALS = [
  { value: "breakfast", label: "Завтрак" },
  { value: "lunch", label: "Обед" },
  { value: "dinner", label: "Ужин" },
  { value: "snack", label: "Перекусы" },
] as const;
export type Meal = (typeof MEALS)[number]["value"];

export function isMeal(v: unknown): v is Meal {
  return MEALS.some((m) => m.value === v);
}

/** Приём пищи по времени суток (по Алматы) — для быстрого «+». */
export function mealByHour(hour: number): Meal {
  if (hour < 11) return "breakfast";
  if (hour < 16) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}

export type FoodEntry = {
  id: string;
  entry_date: string;
  meal: Meal;
  name: string;
  grams: number | null;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  caffeine_mg: number;
};

export type Food = {
  id: string;
  family_id: string | null;
  name: string;
  brand: string | null;
  barcode: string | null;
  kcal_100: number;
  protein_100: number;
  fat_100: number;
  carbs_100: number;
  caffeine_100: number;
  portion_g: number;
  portion_label: string | null;
  pregnancy_warning: string | null;
};

export const FOOD_COLUMNS =
  "id, family_id, name, brand, barcode, kcal_100, protein_100, fat_100, carbs_100, caffeine_100, portion_g, portion_label, pregnancy_warning";

export type DayTotals = { kcal: number; protein: number; fat: number; carbs: number; caffeine: number };

export const getHealthProfile = cache(async (): Promise<HealthProfile & { exists: boolean }> => {
  const supabase = await createClient();
  const { data } = await supabase.from("health_profiles").select("*").maybeSingle();
  if (!data) return { ...DEFAULT_HEALTH_PROFILE, exists: false };
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return {
    ...DEFAULT_HEALTH_PROFILE,
    ...data,
    height_cm: num(data.height_cm),
    goal_weight_kg: num(data.goal_weight_kg),
    pre_pregnancy_weight_kg: num(data.pre_pregnancy_weight_kg),
    gain_min_kg: num(data.gain_min_kg),
    gain_max_kg: num(data.gain_max_kg),
    exists: true,
  };
});

export type WeightEntry = WeightPoint & {
  id: string;
  waist_cm: number | null;
  hips_cm: number | null;
  chest_cm: number | null;
  note: string | null;
};

export const getWeights = cache(async (sinceDate?: string): Promise<WeightEntry[]> => {
  const supabase = await createClient();
  let q = supabase
    .from("weight_entries")
    .select("id, entry_date, weight_kg, waist_cm, hips_cm, chest_cm, note")
    .order("entry_date", { ascending: true });
  if (sinceDate) q = q.gte("entry_date", sinceDate);
  const { data } = await q;
  return (data ?? []).map((r) => ({
    id: r.id,
    date: r.entry_date,
    kg: Number(r.weight_kg),
    waist_cm: r.waist_cm === null ? null : Number(r.waist_cm),
    hips_cm: r.hips_cm === null ? null : Number(r.hips_cm),
    chest_cm: r.chest_cm === null ? null : Number(r.chest_cm),
    note: r.note,
  }));
});

export const getLatestWeight = cache(async (): Promise<WeightEntry | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("weight_entries")
    .select("id, entry_date, weight_kg, waist_cm, hips_cm, chest_cm, note")
    .order("entry_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    date: data.entry_date,
    kg: Number(data.weight_kg),
    waist_cm: data.waist_cm,
    hips_cm: data.hips_cm,
    chest_cm: data.chest_cm,
    note: data.note,
  };
});

export const getFoodEntries = cache(async (date: string): Promise<FoodEntry[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("food_entries")
    .select("id, entry_date, meal, name, grams, kcal, protein, fat, carbs, caffeine_mg")
    .eq("entry_date", date)
    .order("created_at", { ascending: true });
  return (data ?? []).map((r) => ({
    ...r,
    grams: r.grams === null ? null : Number(r.grams),
    kcal: Number(r.kcal),
    protein: Number(r.protein),
    fat: Number(r.fat),
    carbs: Number(r.carbs),
    caffeine_mg: Number(r.caffeine_mg),
  }));
});

export function sumEntries(entries: FoodEntry[]): DayTotals {
  return entries.reduce(
    (t, e) => ({
      kcal: t.kcal + e.kcal,
      protein: t.protein + e.protein,
      fat: t.fat + e.fat,
      carbs: t.carbs + e.carbs,
      caffeine: t.caffeine + e.caffeine_mg,
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0, caffeine: 0 },
  );
}

export const getWater = cache(async (date: string): Promise<number> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("daily_logs")
    .select("water_ml")
    .eq("log_date", date)
    .maybeSingle();
  return data?.water_ml ?? 0;
});

/** Итоги калорий по дням за период — для графика в «Прогрессе». */
export async function getDailyKcal(sinceDate: string): Promise<{ date: string; kcal: number }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("food_entries")
    .select("entry_date, kcal")
    .gte("entry_date", sinceDate);
  const byDay = new Map<string, number>();
  for (const r of data ?? []) byDay.set(r.entry_date, (byDay.get(r.entry_date) ?? 0) + Number(r.kcal));
  return [...byDay.entries()].map(([date, kcal]) => ({ date, kcal: Math.round(kcal) }));
}

/** Последние разные блюда из дневника — для добавления в одно нажатие. */
export async function getRecentFoods(limit = 12) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("food_entries")
    .select("food_id, name, grams, kcal, protein, fat, carbs, caffeine_mg")
    .order("created_at", { ascending: false })
    .limit(60);
  const seen = new Set<string>();
  const out: Omit<FoodEntry, "id" | "entry_date" | "meal">[] = [];
  for (const r of data ?? []) {
    const key = `${r.name}|${r.grams ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name: r.name,
      grams: r.grams === null ? null : Number(r.grams),
      kcal: Number(r.kcal),
      protein: Number(r.protein),
      fat: Number(r.fat),
      carbs: Number(r.carbs),
      caffeine_mg: Number(r.caffeine_mg),
    });
    if (out.length >= limit) break;
  }
  return out;
}

export function toFood(r: Record<string, unknown>): Food {
  return {
    id: String(r.id),
    family_id: (r.family_id as string | null) ?? null,
    name: String(r.name),
    brand: (r.brand as string | null) ?? null,
    barcode: (r.barcode as string | null) ?? null,
    kcal_100: Number(r.kcal_100),
    protein_100: Number(r.protein_100),
    fat_100: Number(r.fat_100),
    carbs_100: Number(r.carbs_100),
    caffeine_100: Number(r.caffeine_100),
    portion_g: Number(r.portion_g),
    portion_label: (r.portion_label as string | null) ?? null,
    pregnancy_warning: (r.pregnancy_warning as string | null) ?? null,
  };
}
