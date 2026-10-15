"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { askClaude } from "@/lib/ai";
import { distributeNutrition, MenuSchema, planToRows, SwapSchema, type AiDish } from "@/lib/ai-schemas";
import { getHealthProfile, MEALS } from "@/lib/data";
import { checkRange, isDate, num, str } from "@/lib/form";
import { addDays } from "@/lib/health";
import { kidPortion, weekDays, weekStartOf } from "@/lib/menu";
import { getFamilyServings, getRecipes } from "@/lib/menu-data";
import { getChildren } from "@/lib/meds-data";
import { getSession } from "@/lib/session";
import { syncShoppingForWeek } from "@/lib/shopping-sync";
import { createClient } from "@/lib/supabase/server";
import { todayKey } from "@/lib/time";

export type MenuAiState = { error?: string };

const SYSTEM = `Ты — домашний повар-нутрициолог для семьи в Казахстане (Алматы). Составляешь простое домашнее меню из продуктов, которые легко купить в обычном магазине или на базаре.
Правила:
- Готовить один раз — есть дважды: блюда на обед и ужин повторяются 2 дня подряд, завтраки — 2–3 вида на неделю. Всего 8–14 разных блюд.
- Ингредиенты — на весь рецепт (поле servings), в граммах, миллилитрах или штуках, с отделом магазина из списка.
- КБЖУ — на одну взрослую порцию; учитывай калорийные цели взрослых.
- Если блюдо есть в списке рецептов семьи — бери его, указав точное название в existing_recipe_title, а ingredients и steps оставь пустыми.
- Для маленьких детей — блюда без острого; детская порция — половина взрослой.
- Шаги — коротко, 3–6 шагов, каждый с новой строки.
- dish_key — уникальный короткий ключ латиницей; каждый слот плана ссылается на блюдо из dishes.`;

const PREGNANCY = `Важно: в семье беременная. Все блюда должны быть безопасны при беременности: без алкоголя; рыба, мясо и яйца — только полностью прожаренные или проваренные; без сырой рыбы и суши, без непастеризованных сыров и молока, без рыбы с высоким содержанием ртути (акула, рыба-меч, королевская макрель, крупный тунец), без большого количества печени; умеренно соли и сахара.`;

function mealLabel(m: string) {
  return MEALS.find((x) => x.value === m)?.label ?? m;
}

async function familyContext() {
  const [session, children, recipes, servings, health] = await Promise.all([
    getSession(),
    getChildren(),
    getRecipes(),
    getFamilyServings(),
    getHealthProfile(),
  ]);
  const today = todayKey();
  const kids = children
    .map((c) => ({ name: c.name, portion: kidPortion(c.birth_date, today), birth: c.birth_date }))
    .filter((c) => c.portion > 0);
  return { session, kids, recipes, servings, health };
}

/** Создать рецепт семьи из блюда AI (с ингредиентами и КБЖУ). */
async function saveDish(dish: AiDish, familyId: string): Promise<string | null> {
  const supabase = await createClient();
  const { servings, ingredients } = distributeNutrition(dish);
  const { data } = await supabase
    .from("recipes")
    .insert({
      family_id: familyId,
      title: dish.title.trim().slice(0, 100) || "Блюдо",
      servings,
      cook_minutes: Math.min(1440, Math.max(1, Math.round(dish.cook_minutes || 30))),
      steps: dish.steps.slice(0, 6000) || null,
      kid_friendly: true,
      note: "Составлено AI — проверьте и поправьте под себя",
    })
    .select("id")
    .single();
  if (!data) return null;
  if (ingredients.length) {
    await supabase.from("recipe_ingredients").insert(ingredients.map((i) => ({ ...i, recipe_id: data.id })));
  }
  return data.id;
}

/** Меню на неделю + список покупок — одной кнопкой. */
export async function generateMenu(_prev: MenuAiState, formData: FormData): Promise<MenuAiState> {
  const ctx = await familyContext();
  if (!ctx.session?.family) return { error: "Нужно войти заново" };
  const familyId = ctx.session.family.id;

  const week = str(formData, "week");
  const start = isDate(week) ? weekStartOf(week) : weekStartOf(todayKey());
  const days = weekDays(start);
  const meals = MEALS.map((m) => m.value).filter((m) => formData.get(`meal_${m}`) === "on");
  const eaters = num(formData, "eaters");
  const budget = num(formData, "budget");
  const minutes = num(formData, "minutes");
  const kcalMe = num(formData, "kcal_me");
  const kcalPartner = num(formData, "kcal_partner");
  const problems = [
    !meals.length ? "Выберите хотя бы один приём пищи" : null,
    eaters === null ? "Сколько порций" : checkRange(eaters, 1, 20, "Порции"),
    checkRange(budget, 1000, 2000000, "Бюджет"),
    checkRange(minutes, 5, 240, "Время готовки"),
    checkRange(kcalMe, 1000, 5000, "Ккал"),
    checkRange(kcalPartner, 1000, 5000, "Ккал партнёра"),
  ].filter(Boolean);
  if (problems.length) return { error: problems.join(". ") };
  const pregnancy = formData.get("pregnancy") === "on";
  const exclude = str(formData, "exclude").slice(0, 300);
  const wishes = str(formData, "wishes").slice(0, 500);

  const recipeList = ctx.recipes
    .slice(0, 60)
    .map((r) => `- ${r.title} (${r.perServing.kcal} ккал/порц.)`)
    .join("\n");
  const prompt = [
    `Составь меню на неделю ${days[0]} — ${days[6]} (день 0 — понедельник).`,
    `Приёмы пищи: ${meals.map(mealLabel).join(", ")}.`,
    `Едоков: ${eaters} порции на приём пищи.`,
    ctx.kids.length ? `Дети: ${ctx.kids.map((k) => `${k.name}, родилась/родился ${k.birth}`).join("; ")} — детские порции, без острого.` : null,
    kcalMe || kcalPartner
      ? `Калории в день: ${[kcalMe ? `взрослый 1 — ${kcalMe} ккал` : null, kcalPartner ? `взрослый 2 — ${kcalPartner} ккал` : null].filter(Boolean).join(", ")}.`
      : null,
    budget ? `Бюджет на продукты на неделю: около ${budget} ₸ (цены Алматы).` : null,
    minutes ? `Готовка одного блюда — не дольше ${minutes} минут.` : null,
    exclude ? `Не использовать: ${exclude}.` : null,
    wishes ? `Пожелания: ${wishes}.` : null,
    pregnancy ? PREGNANCY : null,
    recipeList ? `Рецепты семьи, которые можно использовать:\n${recipeList}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await askClaude({
    kind: "menu",
    schema: MenuSchema,
    system: SYSTEM,
    content: [{ type: "text", text: prompt }],
    effort: "medium",
    maxTokens: 32000,
  });
  if (!result.ok) return { error: result.error };
  const menu = result.data;

  // Блюда: свои рецепты по названию или новые рецепты семьи.
  const byTitle = new Map(ctx.recipes.map((r) => [r.title.trim().toLowerCase(), r.id]));
  const dishIds = new Map<string, { id: string | null; title: string }>();
  for (const dish of menu.dishes.slice(0, 25)) {
    const existing = dish.existing_recipe_title ? byTitle.get(dish.existing_recipe_title.trim().toLowerCase()) : undefined;
    const id = existing ?? (dish.ingredients.length ? await saveDish(dish, familyId) : null);
    dishIds.set(dish.key, { id, title: dish.title.trim().slice(0, 100) || "Блюдо" });
  }

  const supabase = await createClient();
  const replace = formData.get("replace") === "on";
  if (replace) {
    await supabase.from("meal_plan").delete().gte("plan_date", days[0]).lte("plan_date", days[6]);
  }
  const { data: taken } = await supabase.from("meal_plan").select("plan_date, meal").gte("plan_date", days[0]).lte("plan_date", days[6]);
  const busy = new Set((taken ?? []).map((t) => `${t.plan_date}|${t.meal}`));
  const rows = planToRows(menu, days, meals)
    .filter((r) => !busy.has(`${r.date}|${r.meal}`))
    .map((r) => {
      const d = dishIds.get(r.dish_key)!;
      return { plan_date: r.date, meal: r.meal, recipe_id: d.id, title: d.title, servings: Math.round((eaters as number) * 2) / 2 };
    });
  if (rows.length) await supabase.from("meal_plan").insert(rows);

  await syncShoppingForWeek(start);
  revalidatePath("/", "layout");
  redirect(`/menu?week=${start}&ai=${rows.length}`);
}

/** «Предложи другое»: AI подбирает замену одному блюду в меню. */
export async function swapDish(formData: FormData) {
  const ctx = await familyContext();
  if (!ctx.session?.family) return;
  const supabase = await createClient();
  const { data: item } = await supabase
    .from("meal_plan")
    .select("id, plan_date, meal, title, servings")
    .eq("id", str(formData, "id"))
    .maybeSingle();
  if (!item) return;
  const start = weekStartOf(item.plan_date);
  const { data: week } = await supabase.from("meal_plan").select("title").gte("plan_date", start).lte("plan_date", addDays(start, 6));
  const pregnancy = ctx.health.is_pregnant;

  const prompt = [
    `Предложи одно другое блюдо вместо «${item.title}» на ${mealLabel(item.meal).toLowerCase()} (${item.plan_date}).`,
    `Не повторяй блюда этой недели: ${[...new Set((week ?? []).map((w) => w.title))].join(", ")}.`,
    ctx.kids.length ? "В семье маленький ребёнок — без острого." : null,
    pregnancy ? PREGNANCY : null,
    "Верни одно блюдо с ингредиентами и шагами; existing_recipe_title = null.",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await askClaude({
    kind: "swap",
    schema: SwapSchema,
    system: SYSTEM,
    content: [{ type: "text", text: prompt }],
    effort: "low",
    maxTokens: 6000,
  });
  if (!result.ok) {
    redirect(`/menu?week=${start}&ai_error=${encodeURIComponent(result.error)}#d-${item.plan_date}`);
  }
  const id = await saveDish(result.data.dish, ctx.session.family.id);
  if (id) {
    await supabase
      .from("meal_plan")
      .update({ recipe_id: id, title: result.data.dish.title.trim().slice(0, 100) || "Блюдо" })
      .eq("id", item.id);
  }
  revalidatePath("/", "layout");
  redirect(`/menu?week=${start}#d-${item.plan_date}`);
}
