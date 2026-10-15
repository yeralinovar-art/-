import "server-only";
import { aggregateShopping, planShoppingSync, weekDays, type ShoppingItem } from "@/lib/menu";
import { getRecipesWithIngredients } from "@/lib/menu-data";
import { createClient } from "@/lib/supabase/server";

/**
 * Пересобрать список покупок из меню недели. Свежие запросы (без кэша запроса) —
 * чтобы сразу после записи меню список учитывал новые блюда. Возвращает число добавленных.
 */
export async function syncShoppingForWeek(start: string): Promise<number> {
  const supabase = await createClient();
  const days = weekDays(start);
  const [{ data: plan }, { data: shopping }] = await Promise.all([
    supabase.from("meal_plan").select("recipe_id, servings").gte("plan_date", days[0]).lte("plan_date", days[6]),
    supabase.from("shopping_items").select("id, name, amount, unit, department, checked, source, week_start"),
  ]);
  const rows = (plan ?? []).map((p) => ({ recipe_id: p.recipe_id as string | null, servings: Number(p.servings) }));
  const recipes = await getRecipesWithIngredients([...new Set(rows.map((p) => p.recipe_id).filter((v): v is string => Boolean(v)))]);
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const needs = aggregateShopping(rows.map((p) => ({ servings: p.servings, recipe: p.recipe_id ? (byId.get(p.recipe_id) ?? null) : null })));
  const existing = (shopping ?? []).map((r) => ({ ...r, amount: r.amount === null ? null : Number(r.amount) })) as ShoppingItem[];
  const { removeIds, insert } = planShoppingSync(existing, needs, start);
  if (removeIds.length) await supabase.from("shopping_items").delete().in("id", removeIds);
  if (insert.length) {
    await supabase.from("shopping_items").insert(
      insert.map((n) => ({ name: n.name, amount: n.amount, unit: n.amount === null ? null : n.unit, department: n.department, source: "menu", week_start: start })),
    );
  }
  return insert.length;
}
