// Схемы ответов AI и чистые функции обработки — без обращения к API и базе.

import { z } from "zod";

const DEPARTMENTS = [
  "Овощи и фрукты",
  "Мясо и птица",
  "Рыба",
  "Молочное и яйца",
  "Хлеб и выпечка",
  "Бакалея",
  "Заморозка",
  "Сладкое и снеки",
  "Напитки",
  "Другое",
] as const;

// ---------------------------------------------------------------------------
// Оценка еды по тексту или фото
// ---------------------------------------------------------------------------

export const FoodEstimateSchema = z.object({
  items: z.array(
    z.object({
      name: z.string().describe("Название блюда или продукта по-русски, коротко"),
      grams: z.number().describe("Вес или объём порции"),
      unit: z.enum(["г", "мл"]),
      kcal: z.number().describe("Калории на всю порцию"),
      protein: z.number(),
      fat: z.number(),
      carbs: z.number(),
      caffeine_mg: z.number().describe("Кофеин на порцию, 0 если нет"),
      pregnancy_note: z
        .string()
        .nullable()
        .describe("Только если продукт небезопасен или ограничен при беременности — коротко почему; иначе null"),
    }),
  ),
  comment: z.string().nullable().describe("Короткое пояснение, если что-то неясно на фото или в описании; иначе null"),
});
export type FoodEstimate = z.infer<typeof FoodEstimateSchema>;
export type FoodEstimateItem = FoodEstimate["items"][number];

const r1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, min: number, max: number) => (Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min);

/** Приводим числа к допустимым диапазонам дневника. */
export function sanitizeFoodItem(i: FoodEstimateItem): FoodEstimateItem {
  return {
    name: i.name.trim().slice(0, 120) || "Блюдо",
    grams: Math.round(clamp(i.grams, 1, 5000)),
    unit: i.unit === "мл" ? "мл" : "г",
    kcal: Math.round(clamp(i.kcal, 0, 10000)),
    protein: r1(clamp(i.protein, 0, 1000)),
    fat: r1(clamp(i.fat, 0, 1000)),
    carbs: r1(clamp(i.carbs, 0, 1000)),
    caffeine_mg: Math.round(clamp(i.caffeine_mg, 0, 2000)),
    pregnancy_note: i.pregnancy_note?.trim() ? i.pregnancy_note.trim().slice(0, 200) : null,
  };
}

/** Пересчёт при изменении веса порции пользователем — пропорционально. */
export function rescaleFoodItem(i: FoodEstimateItem, grams: number): FoodEstimateItem {
  if (!(grams > 0) || !(i.grams > 0)) return i;
  const k = grams / i.grams;
  return {
    ...i,
    grams: Math.round(grams),
    kcal: Math.round(i.kcal * k),
    protein: r1(i.protein * k),
    fat: r1(i.fat * k),
    carbs: r1(i.carbs * k),
    caffeine_mg: Math.round(i.caffeine_mg * k),
  };
}

// ---------------------------------------------------------------------------
// Меню на неделю
// ---------------------------------------------------------------------------

const IngredientSchema = z.object({
  name: z.string(),
  amount: z.number(),
  unit: z.enum(["г", "мл", "шт"]),
  department: z.enum(DEPARTMENTS),
});

const DishSchema = z.object({
  key: z.string().describe("Короткий уникальный ключ блюда, латиницей"),
  title: z.string(),
  existing_recipe_title: z
    .string()
    .nullable()
    .describe("Точное название рецепта из списка семьи, если блюдо взято оттуда; иначе null"),
  cook_minutes: z.number(),
  servings: z.number().describe("На сколько порций рецепт"),
  kcal_per_serving: z.number(),
  protein: z.number(),
  fat: z.number(),
  carbs: z.number(),
  ingredients: z.array(IngredientSchema).describe("Пусто, если блюдо из списка семьи"),
  steps: z.string().describe("3–6 коротких шагов через перевод строки; пусто, если блюдо из списка семьи"),
});

export const MenuSchema = z.object({
  dishes: z.array(DishSchema),
  plan: z.array(
    z.object({
      day: z.number().describe("0 — понедельник … 6 — воскресенье"),
      meal: z.enum(["breakfast", "lunch", "dinner", "snack"]),
      dish_key: z.string(),
    }),
  ),
  notes: z.string().nullable().describe("1–2 предложения: как устроено меню, что приготовить заранее"),
});
export type AiMenu = z.infer<typeof MenuSchema>;
export type AiDish = AiMenu["dishes"][number];

export const SwapSchema = z.object({ dish: DishSchema });

/** Примерный вес единицы для распределения КБЖУ по ингредиентам. */
function weightOf(i: { amount: number; unit: string }): number {
  return i.unit === "шт" ? i.amount * 60 : i.amount;
}

/**
 * КБЖУ блюда от AI раскладываем по ингредиентам пропорционально весу —
 * тогда «ккал на порцию» в рецепте совпадает с оценкой AI.
 */
export function distributeNutrition(dish: Pick<AiDish, "ingredients" | "servings" | "kcal_per_serving" | "protein" | "fat" | "carbs">) {
  const servings = Math.max(1, Math.round(clamp(dish.servings, 1, 30)));
  const total = {
    kcal: clamp(dish.kcal_per_serving, 0, 5000) * servings,
    protein: clamp(dish.protein, 0, 500) * servings,
    fat: clamp(dish.fat, 0, 500) * servings,
    carbs: clamp(dish.carbs, 0, 500) * servings,
  };
  const items = dish.ingredients
    .filter((i) => i.name.trim())
    .slice(0, 40)
    .map((i) => ({ ...i, amount: Math.round(clamp(i.amount, 0.5, 100000) * 10) / 10 }));
  const sum = items.reduce((s, i) => s + weightOf(i), 0) || 1;
  return {
    servings,
    ingredients: items.map((i, position) => {
      const share = weightOf(i) / sum;
      return {
        position,
        name: i.name.trim().slice(0, 120),
        amount: i.amount,
        unit: i.unit,
        department: i.department,
        kcal: r1(total.kcal * share),
        protein: r1(total.protein * share),
        fat: r1(total.fat * share),
        carbs: r1(total.carbs * share),
      };
    }),
  };
}

/** План от AI → строки меню: только известные блюда, дни 0–6, без повторов слотов. */
export function planToRows(menu: Pick<AiMenu, "plan" | "dishes">, weekDays: string[], meals: string[]) {
  const keys = new Set(menu.dishes.map((d) => d.key));
  const seen = new Set<string>();
  const rows: { date: string; meal: string; dish_key: string }[] = [];
  for (const p of menu.plan) {
    const day = Math.round(p.day);
    if (day < 0 || day > 6 || !keys.has(p.dish_key) || !meals.includes(p.meal)) continue;
    const slot = `${day}|${p.meal}`;
    if (seen.has(slot)) continue;
    seen.add(slot);
    rows.push({ date: weekDays[day], meal: p.meal, dish_key: p.dish_key });
  }
  return rows;
}
