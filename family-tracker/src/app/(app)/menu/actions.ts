"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isMeal, mealByHour } from "@/lib/data";
import { checkRange, error, isDate, num, ok, str, type FormMessageState } from "@/lib/form";
import {
  aggregateShopping,
  guessDepartment,
  INGREDIENT_UNITS,
  isDepartment,
  planShoppingSync,
  scaleNutrition,
  weekDays,
  weekStartOf,
  type IngredientUnit,
} from "@/lib/menu";
import { getPlan, getRecipe, getRecipesWithIngredients, getShopping } from "@/lib/menu-data";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { TIME_ZONE, todayKey } from "@/lib/time";

const r1 = (n: number) => Math.round(n * 10) / 10;
const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v);

function refresh() {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Недельное меню
// ---------------------------------------------------------------------------

export async function addToPlan(_prev: FormMessageState, formData: FormData): Promise<FormMessageState> {
  const session = await getSession();
  if (!session?.family) return error("Нужно войти заново");
  const date = str(formData, "date");
  const meal = str(formData, "meal");
  const recipeId = str(formData, "recipe_id");
  const servings = num(formData, "servings");
  let title = str(formData, "title").slice(0, 100);
  const problems = [
    !isDate(date) ? "Выберите день" : null,
    !isMeal(meal) ? "Выберите приём пищи" : null,
    servings === null ? "Сколько порций" : checkRange(servings, 0.5, 30, "Порции"),
  ].filter(Boolean);
  if (problems.length) return error(problems.join(". "));

  const supabase = await createClient();
  if (recipeId) {
    const recipe = await getRecipe(recipeId);
    if (!recipe) return error("Рецепт не найден");
    title = recipe.title;
  }
  if (!title) return error("Выберите рецепт или напишите блюдо");

  const { error: dbError } = await supabase.from("meal_plan").insert({
    plan_date: date,
    meal,
    recipe_id: recipeId || null,
    title,
    servings: Math.round((servings as number) * 2) / 2,
    note: str(formData, "note").slice(0, 200) || null,
  });
  if (dbError) return error(dbError.message);
  refresh();
  redirect(`/menu?week=${weekStartOf(date)}#d-${date}`);
}

export async function deletePlanItem(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("meal_plan").delete().eq("id", str(formData, "id"));
  refresh();
}

/** «Съел(а)»: блюдо из меню попадает в личный дневник питания. */
export async function eatPlanItem(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const supabase = await createClient();
  const { data: item } = await supabase
    .from("meal_plan")
    .select("id, plan_date, meal, recipe_id, title")
    .eq("id", str(formData, "id"))
    .maybeSingle();
  if (!item) return;

  // Ели сегодня — пишем в сегодня; запланированное на другой день — в его дату, если она уже наступила.
  const today = todayKey();
  const date = item.plan_date <= today ? item.plan_date : today;
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", hour12: false }).format(new Date()));
  const meal = isMeal(item.meal) ? item.meal : mealByHour(hour);

  const recipe = item.recipe_id ? await getRecipe(item.recipe_id) : null;
  if (!recipe) {
    // Блюдо без рецепта: калории спросим в дневнике.
    redirect(`/food/add?q=${encodeURIComponent(item.title)}&meal=${meal}&date=${date}`);
  }
  const portion = Number(str(formData, "portion")) || 1;
  const k = [0.5, 1, 1.5, 2].includes(portion) ? portion : 1;
  const n = scaleNutrition(recipe.perServing, k);
  await supabase.from("food_entries").insert({
    user_id: session.userId,
    entry_date: date,
    meal,
    food_id: null,
    name: k === 1 ? recipe.title : `${recipe.title} (${k.toLocaleString("ru-RU")} порц.)`,
    grams: null,
    unit: "г",
    kcal: n.kcal,
    protein: n.protein,
    fat: n.fat,
    carbs: n.carbs,
    caffeine_mg: 0,
  });
  refresh();
  redirect(date === today ? "/food" : `/food?date=${date}`);
}

/** Повторить меню прошлой недели на эту. */
export async function copyPreviousWeek(formData: FormData) {
  const week = str(formData, "week");
  if (!isDate(week)) return;
  const days = weekDays(weekStartOf(week));
  const prev = new Date(`${days[0]}T00:00:00Z`);
  prev.setUTCDate(prev.getUTCDate() - 7);
  const prevDays = weekDays(prev.toISOString().slice(0, 10));
  const items = await getPlan(prevDays[0], prevDays[6]);
  if (!items.length) return;
  const supabase = await createClient();
  await supabase.from("meal_plan").insert(
    items.map((i) => ({
      plan_date: days[prevDays.indexOf(i.plan_date)],
      meal: i.meal,
      recipe_id: i.recipe_id,
      title: i.title,
      servings: i.servings,
      note: i.note,
    })),
  );
  refresh();
}

// ---------------------------------------------------------------------------
// Рецепты
// ---------------------------------------------------------------------------

type IngredientInput = { food_id?: string | null; name?: string; amount?: number | string | null; unit?: string };

export async function saveRecipe(_prev: FormMessageState, formData: FormData): Promise<FormMessageState> {
  const session = await getSession();
  if (!session?.family) return error("Нужно войти заново");
  const id = str(formData, "id");
  const title = str(formData, "title").slice(0, 100);
  const servings = num(formData, "servings");
  const minutes = num(formData, "cook_minutes");
  let raw: IngredientInput[] = [];
  try {
    raw = JSON.parse(str(formData, "ingredients") || "[]");
  } catch {
    return error("Не удалось прочитать ингредиенты");
  }
  const problems = [
    !title ? "Название рецепта" : null,
    servings === null ? "На сколько порций" : checkRange(servings, 1, 30, "Порции"),
    checkRange(minutes, 1, 1440, "Время"),
    !Array.isArray(raw) || raw.length > 40 ? "Не больше 40 ингредиентов" : null,
  ].filter(Boolean);
  if (problems.length) return error(problems.join(". "));

  const supabase = await createClient();
  const foodIds = raw.map((i) => i.food_id).filter((v): v is string => typeof v === "string" && isUuid(v));
  const { data: foods } = foodIds.length
    ? await supabase
        .from("foods")
        .select("id, name, kcal_100, protein_100, fat_100, carbs_100, portion_g, department, pregnancy_warning")
        .in("id", foodIds)
    : { data: [] };
  const byId = new Map((foods ?? []).map((f) => [f.id, f]));

  const ingredients = [];
  for (const [position, i] of raw.entries()) {
    const name = String(i.name ?? "").trim().slice(0, 120);
    if (!name) continue;
    const unit: IngredientUnit = INGREDIENT_UNITS.includes(i.unit as IngredientUnit) ? (i.unit as IngredientUnit) : "г";
    const amount = i.amount === null || i.amount === undefined || i.amount === "" ? null : Number(String(i.amount).replace(",", "."));
    if (amount !== null && (!Number.isFinite(amount) || amount <= 0 || amount > 100000)) return error(`${name}: проверьте количество`);
    const food = i.food_id ? byId.get(i.food_id) : undefined;
    const grams = food && amount !== null ? (unit === "шт" ? amount * Number(food.portion_g) : amount) : 0;
    ingredients.push({
      position,
      food_id: food?.id ?? null,
      name,
      amount,
      unit,
      kcal: food ? r1((Number(food.kcal_100) * grams) / 100) : 0,
      protein: food ? r1((Number(food.protein_100) * grams) / 100) : 0,
      fat: food ? r1((Number(food.fat_100) * grams) / 100) : 0,
      carbs: food ? r1((Number(food.carbs_100) * grams) / 100) : 0,
      department: isDepartment(food?.department) ? food.department : guessDepartment(name),
      pregnancy_warning: food?.pregnancy_warning ?? null,
    });
  }

  const photo = str(formData, "photo_path");
  const row = {
    title,
    servings: Math.round(servings as number),
    cook_minutes: minutes === null ? null : Math.round(minutes),
    steps: str(formData, "steps").slice(0, 6000) || null,
    note: str(formData, "note").slice(0, 300) || null,
    kid_friendly: formData.get("kid_friendly") === "on",
    // Фото только из папки своей семьи.
    photo_path: photo.startsWith(`${session.family.id}/`) ? photo.slice(0, 300) : null,
  };

  let recipeId = id;
  if (id) {
    const { data, error: dbError } = await supabase.from("recipes").update(row).eq("id", id).select("id").maybeSingle();
    if (dbError) return error(dbError.message);
    if (!data) return error("Рецепт не найден");
    await supabase.from("recipe_ingredients").delete().eq("recipe_id", id);
  } else {
    const { data, error: dbError } = await supabase
      .from("recipes")
      .insert({ ...row, family_id: session.family.id })
      .select("id")
      .single();
    if (dbError) return error(dbError.message);
    recipeId = data.id;
  }
  if (ingredients.length) {
    const { error: dbError } = await supabase
      .from("recipe_ingredients")
      .insert(ingredients.map((i) => ({ ...i, recipe_id: recipeId })));
    if (dbError) return error(dbError.message);
  }
  refresh();
  redirect(`/menu/recipes/${recipeId}`);
}

/** Копия готового рецепта в рецепты семьи — чтобы поменять под себя. */
export async function copyRecipe(formData: FormData) {
  const session = await getSession();
  if (!session?.family) redirect("/login");
  const recipe = await getRecipe(str(formData, "id"));
  if (!recipe) return;
  const supabase = await createClient();
  const { data } = await supabase
    .from("recipes")
    .insert({
      family_id: session.family.id,
      title: recipe.title,
      servings: recipe.servings,
      cook_minutes: recipe.cook_minutes,
      steps: recipe.steps,
      note: recipe.note,
      kid_friendly: recipe.kid_friendly,
    })
    .select("id")
    .single();
  if (!data) return;
  if (recipe.ingredients.length) {
    await supabase.from("recipe_ingredients").insert(
      recipe.ingredients.map((i) => ({
        recipe_id: data.id,
        position: i.position,
        food_id: i.food_id,
        name: i.name,
        amount: i.amount,
        unit: i.unit,
        kcal: i.kcal,
        protein: i.protein,
        fat: i.fat,
        carbs: i.carbs,
        department: i.department,
        pregnancy_warning: i.pregnancy_warning,
      })),
    );
  }
  refresh();
  redirect(`/menu/recipes/${data.id}/edit`);
}

export async function deleteRecipe(formData: FormData) {
  const supabase = await createClient();
  const { data } = await supabase.from("recipes").delete().eq("id", str(formData, "id")).select("photo_path").maybeSingle();
  if (data?.photo_path) await supabase.storage.from("recipe-photos").remove([data.photo_path]);
  refresh();
  redirect("/menu/recipes");
}

// ---------------------------------------------------------------------------
// Список покупок
// ---------------------------------------------------------------------------

/** Собрать список из меню недели. */
export async function buildShoppingFromMenu(formData: FormData) {
  const session = await getSession();
  if (!session?.family) redirect("/login");
  const week = str(formData, "week");
  const start = isDate(week) ? weekStartOf(week) : weekStartOf(todayKey());
  const days = weekDays(start);
  const plan = await getPlan(days[0], days[6]);
  const recipes = await getRecipesWithIngredients([...new Set(plan.map((p) => p.recipe_id).filter((v): v is string => Boolean(v)))]);
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const needs = aggregateShopping(plan.map((p) => ({ servings: p.servings, recipe: p.recipe_id ? (byId.get(p.recipe_id) ?? null) : null })));
  const existing = await getShopping();
  const { removeIds, insert } = planShoppingSync(existing, needs, start);

  const supabase = await createClient();
  if (removeIds.length) await supabase.from("shopping_items").delete().in("id", removeIds);
  if (insert.length) {
    await supabase.from("shopping_items").insert(
      insert.map((n) => ({ name: n.name, amount: n.amount, unit: n.amount === null ? null : n.unit, department: n.department, source: "menu", week_start: start })),
    );
  }
  refresh();
  redirect(`/menu/shopping?built=${insert.length}`);
}

export async function addShoppingItem(_prev: FormMessageState, formData: FormData): Promise<FormMessageState> {
  const session = await getSession();
  if (!session?.family) return error("Нужно войти заново");
  // Можно вписать сразу несколько через запятую или с новой строки.
  const names = str(formData, "name")
    .split(/[,\n]/)
    .map((s) => s.trim().slice(0, 120))
    .filter(Boolean)
    .slice(0, 30);
  if (!names.length) return error("Что купить?");
  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from("shopping_items")
    .insert(names.map((name) => ({ name, department: guessDepartment(name), source: "manual" })));
  if (dbError) return error(dbError.message);
  refresh();
  return ok(names.length === 1 ? "Добавлено" : `Добавлено: ${names.length}`);
}

export async function toggleShoppingItem(formData: FormData) {
  const session = await getSession();
  if (!session) return;
  const checked = str(formData, "checked") === "1";
  const supabase = await createClient();
  await supabase
    .from("shopping_items")
    .update({ checked, checked_by: checked ? session.userId : null, checked_at: checked ? new Date().toISOString() : null })
    .eq("id", str(formData, "id"));
  refresh();
}

export async function deleteShoppingItem(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("shopping_items").delete().eq("id", str(formData, "id"));
  refresh();
}

export async function clearCheckedShopping() {
  const supabase = await createClient();
  await supabase.from("shopping_items").delete().eq("checked", true);
  refresh();
}

// ---------------------------------------------------------------------------
// Бюджет на продукты
// ---------------------------------------------------------------------------

export async function addSpend(_prev: FormMessageState, formData: FormData): Promise<FormMessageState> {
  const session = await getSession();
  if (!session?.family) return error("Нужно войти заново");
  const amount = num(formData, "amount");
  const date = str(formData, "spent_on") || todayKey();
  const problems = [
    amount === null ? "Сколько потратили" : checkRange(amount, 1, 10000000, "Сумма"),
    !isDate(date) || date > todayKey() ? "Проверьте дату" : null,
  ].filter(Boolean);
  if (problems.length) return error(problems.join(". "));
  const supabase = await createClient();
  const { error: dbError } = await supabase.from("grocery_spend").insert({
    spent_on: date,
    amount: Math.round(amount as number),
    store: str(formData, "store").slice(0, 60) || null,
    note: str(formData, "note").slice(0, 200) || null,
  });
  if (dbError) return error(dbError.message);
  refresh();
  return ok("Записано");
}

export async function deleteSpend(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("grocery_spend").delete().eq("id", str(formData, "id"));
  refresh();
}
