import "server-only";
import { cache } from "react";
import type { Meal } from "@/lib/data";
import { getChildren } from "@/lib/meds-data";
import { defaultServings, perServing, type Ingredient, type IngredientUnit, type Nutrition, type ShoppingItem } from "@/lib/menu";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { todayKey } from "@/lib/time";

// Меню, рецепты, покупки и траты — общие для семьи (доступ ограничивает RLS).

export type RecipeIngredient = Ingredient & { id: string; position: number; food_id: string | null };

export type RecipeSummary = {
  id: string;
  family_id: string | null;
  title: string;
  servings: number;
  cook_minutes: number | null;
  kid_friendly: boolean;
  photo_path: string | null;
  perServing: Nutrition;
};

export type Recipe = RecipeSummary & {
  steps: string | null;
  note: string | null;
  ingredients: RecipeIngredient[];
};

export type PlanItem = {
  id: string;
  plan_date: string;
  meal: Meal;
  recipe_id: string | null;
  title: string;
  servings: number;
  note: string | null;
};

const INGREDIENT_COLUMNS = "id, position, food_id, name, amount, unit, kcal, protein, fat, carbs, department, pregnancy_warning";

function toIngredient(r: Record<string, unknown>): RecipeIngredient {
  return {
    id: String(r.id),
    position: Number(r.position),
    food_id: (r.food_id as string | null) ?? null,
    name: String(r.name),
    amount: r.amount === null ? null : Number(r.amount),
    unit: (r.unit as IngredientUnit) ?? "г",
    kcal: Number(r.kcal),
    protein: Number(r.protein),
    fat: Number(r.fat),
    carbs: Number(r.carbs),
    department: (r.department as string | null) ?? null,
    pregnancy_warning: (r.pregnancy_warning as string | null) ?? null,
  };
}

/** Рецепты семьи и готовые шаблоны, с КБЖУ на порцию. */
export const getRecipes = cache(async (): Promise<RecipeSummary[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recipes")
    .select("id, family_id, title, servings, cook_minutes, kid_friendly, photo_path, recipe_ingredients(kcal, protein, fat, carbs)")
    .order("title");
  return (data ?? []).map((r) => ({
    id: r.id,
    family_id: r.family_id,
    title: r.title,
    servings: r.servings,
    cook_minutes: r.cook_minutes,
    kid_friendly: r.kid_friendly,
    photo_path: r.photo_path,
    perServing: perServing(
      (r.recipe_ingredients ?? []).map((i) => ({ kcal: Number(i.kcal), protein: Number(i.protein), fat: Number(i.fat), carbs: Number(i.carbs) })),
      r.servings,
    ),
  }));
});

export const getRecipe = cache(async (id: string): Promise<Recipe | null> => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("recipes")
    .select(`id, family_id, title, servings, cook_minutes, kid_friendly, photo_path, steps, note, recipe_ingredients(${INGREDIENT_COLUMNS})`)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const ingredients = (data.recipe_ingredients ?? []).map(toIngredient).sort((a, b) => a.position - b.position);
  return {
    id: data.id,
    family_id: data.family_id,
    title: data.title,
    servings: data.servings,
    cook_minutes: data.cook_minutes,
    kid_friendly: data.kid_friendly,
    photo_path: data.photo_path,
    steps: data.steps,
    note: data.note,
    ingredients,
    perServing: perServing(ingredients, data.servings),
  };
});

/** Рецепты с ингредиентами — для сбора списка покупок. */
export async function getRecipesWithIngredients(ids: string[]): Promise<Recipe[]> {
  if (!ids.length) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("recipes")
    .select(`id, family_id, title, servings, cook_minutes, kid_friendly, photo_path, steps, note, recipe_ingredients(${INGREDIENT_COLUMNS})`)
    .in("id", ids);
  return (data ?? []).map((r) => {
    const ingredients = (r.recipe_ingredients ?? []).map(toIngredient);
    return { ...r, ingredients, perServing: perServing(ingredients, r.servings) };
  });
}

export const getPlan = cache(async (from: string, to: string): Promise<PlanItem[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("meal_plan")
    .select("id, plan_date, meal, recipe_id, title, servings, note")
    .gte("plan_date", from)
    .lte("plan_date", to)
    .order("created_at");
  return (data ?? []).map((r) => ({ ...r, servings: Number(r.servings) })) as PlanItem[];
});

export const getShopping = cache(async (): Promise<ShoppingItem[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shopping_items")
    .select("id, name, amount, unit, department, checked, source, week_start")
    .order("created_at");
  return (data ?? []).map((r) => ({ ...r, amount: r.amount === null ? null : Number(r.amount) })) as ShoppingItem[];
});

export type Spend = { id: string; spent_on: string; amount: number; store: string | null; note: string | null };

export const getSpend = cache(async (since: string): Promise<Spend[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("grocery_spend")
    .select("id, spent_on, amount, store, note")
    .gte("spent_on", since)
    .order("spent_on", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []).map((r) => ({ ...r, amount: Number(r.amount) }));
});

/** Порций по умолчанию: взрослые семьи + дети по возрасту. */
export const getFamilyServings = cache(async (): Promise<number> => {
  const [session, children] = await Promise.all([getSession(), getChildren()]);
  const adults = session?.partner ? 2 : 1;
  return defaultServings(adults, children.map((c) => c.birth_date), todayKey());
});

/** Временная ссылка на фото рецепта (корзина приватная). */
export async function photoUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from("recipe-photos").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export async function photoUrls(paths: (string | null)[]): Promise<Map<string, string>> {
  const list = paths.filter((p): p is string => Boolean(p));
  const out = new Map<string, string>();
  if (!list.length) return out;
  const supabase = await createClient();
  const { data } = await supabase.storage.from("recipe-photos").createSignedUrls(list, 3600);
  for (const d of data ?? []) if (d.path && d.signedUrl) out.set(d.path, d.signedUrl);
  return out;
}
