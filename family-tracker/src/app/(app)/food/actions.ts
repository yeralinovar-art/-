"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FOOD_COLUMNS, isMeal, toFood } from "@/lib/data";
import { checkRange, error, isDate, num, str, type FormMessageState } from "@/lib/form";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { todayKey } from "@/lib/time";

const r1 = (n: number) => Math.round(n * 10) / 10;

function target(formData: FormData) {
  const meal = str(formData, "meal");
  const date = str(formData, "date") || todayKey();
  if (!isMeal(meal) || !isDate(date)) return null;
  return { meal, date };
}

function done(date: string): never {
  revalidatePath("/", "layout");
  redirect(date === todayKey() ? "/food" : `/food?date=${date}`);
}

/** Продукт из справочника + граммы. */
export async function addFromFood(_prev: FormMessageState, formData: FormData): Promise<FormMessageState> {
  const session = await getSession();
  if (!session) return error("Нужно войти заново");
  const t = target(formData);
  if (!t) return error("Не выбран приём пищи");
  const grams = num(formData, "grams");
  const bad = grams === null ? "Укажите вес порции" : checkRange(grams, 1, 5000, "Порция");
  if (bad) return error(bad);

  const supabase = await createClient();
  const { data } = await supabase.from("foods").select(FOOD_COLUMNS).eq("id", str(formData, "food_id")).maybeSingle();
  if (!data) return error("Продукт не найден");
  const food = toFood(data);
  const k = (grams as number) / 100;

  const { error: dbError } = await supabase.from("food_entries").insert({
    user_id: session.userId,
    entry_date: t.date,
    meal: t.meal,
    food_id: food.id,
    name: food.brand ? `${food.name} (${food.brand})` : food.name,
    grams,
    kcal: r1(food.kcal_100 * k),
    protein: r1(food.protein_100 * k),
    fat: r1(food.fat_100 * k),
    carbs: r1(food.carbs_100 * k),
    caffeine_mg: r1(food.caffeine_100 * k),
  });
  if (dbError) return error(dbError.message);
  done(t.date);
}

/** Быстрый ввод: название и калории (БЖУ — по желанию). Также «повторить» из недавних. */
export async function addQuick(_prev: FormMessageState, formData: FormData): Promise<FormMessageState> {
  const session = await getSession();
  if (!session) return error("Нужно войти заново");
  const t = target(formData);
  if (!t) return error("Не выбран приём пищи");

  const name = str(formData, "name").slice(0, 120) || "Быстрый ввод";
  const kcal = num(formData, "kcal");
  const protein = num(formData, "protein");
  const fat = num(formData, "fat");
  const carbs = num(formData, "carbs");
  const grams = num(formData, "grams");
  const caffeine = num(formData, "caffeine_mg");
  const problems = [
    kcal === null ? "Укажите калории" : checkRange(kcal, 0, 10000, "Калории"),
    checkRange(protein, 0, 1000, "Белки"),
    checkRange(fat, 0, 1000, "Жиры"),
    checkRange(carbs, 0, 1000, "Углеводы"),
    checkRange(grams, 1, 5000, "Порция"),
    checkRange(caffeine, 0, 2000, "Кофеин"),
  ].filter(Boolean);
  if (problems.length) return error(problems.join(". "));

  const supabase = await createClient();
  const { error: dbError } = await supabase.from("food_entries").insert({
    user_id: session.userId,
    entry_date: t.date,
    meal: t.meal,
    name,
    grams,
    kcal,
    protein: protein ?? 0,
    fat: fat ?? 0,
    carbs: carbs ?? 0,
    caffeine_mg: caffeine ?? 0,
  });
  if (dbError) return error(dbError.message);
  done(t.date);
}

/** Своё блюдо: сохраняется в справочник семьи и сразу добавляется в дневник. */
export async function createFoodAndAdd(_prev: FormMessageState, formData: FormData): Promise<FormMessageState> {
  const session = await getSession();
  if (!session?.family) return error("Нужно войти заново");
  const t = target(formData);
  if (!t) return error("Не выбран приём пищи");

  const name = str(formData, "name").slice(0, 120);
  const kcal = num(formData, "kcal_100");
  const protein = num(formData, "protein_100");
  const fat = num(formData, "fat_100");
  const carbs = num(formData, "carbs_100");
  const grams = num(formData, "grams");
  const problems = [
    !name ? "Назовите блюдо" : null,
    kcal === null ? "Укажите калории на 100 г" : checkRange(kcal, 0, 950, "Калории на 100 г"),
    checkRange(protein, 0, 100, "Белки"),
    checkRange(fat, 0, 100, "Жиры"),
    checkRange(carbs, 0, 100, "Углеводы"),
    grams === null ? "Укажите порцию" : checkRange(grams, 1, 5000, "Порция"),
  ].filter(Boolean);
  if (problems.length) return error(problems.join(". "));

  const supabase = await createClient();
  const { data: food, error: foodError } = await supabase
    .from("foods")
    .insert({
      family_id: session.family.id,
      created_by: session.userId,
      name,
      kcal_100: kcal,
      protein_100: protein ?? 0,
      fat_100: fat ?? 0,
      carbs_100: carbs ?? 0,
      portion_g: grams,
    })
    .select("id")
    .single();
  if (foodError) return error(foodError.message);

  const k = (grams as number) / 100;
  const { error: dbError } = await supabase.from("food_entries").insert({
    user_id: session.userId,
    entry_date: t.date,
    meal: t.meal,
    food_id: food.id,
    name,
    grams,
    kcal: r1((kcal as number) * k),
    protein: r1((protein ?? 0) * k),
    fat: r1((fat ?? 0) * k),
    carbs: r1((carbs ?? 0) * k),
  });
  if (dbError) return error(dbError.message);
  done(t.date);
}

export async function deleteFoodEntry(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("food_entries").delete().eq("id", str(formData, "id"));
  revalidatePath("/", "layout");
}

/** Вода: прибавить или убавить, не уходя ниже нуля. */
export async function addWater(formData: FormData) {
  const session = await getSession();
  if (!session) return;
  const date = str(formData, "date") || todayKey();
  const delta = num(formData, "delta") ?? 0;
  if (!isDate(date) || Number.isNaN(delta) || Math.abs(delta) > 2000) return;

  const supabase = await createClient();
  const { data } = await supabase.from("daily_logs").select("water_ml").eq("log_date", date).maybeSingle();
  const water = Math.max(0, Math.min(20000, (data?.water_ml ?? 0) + delta));
  await supabase.from("daily_logs").upsert({ user_id: session.userId, log_date: date, water_ml: water });
  revalidatePath("/", "layout");
}
