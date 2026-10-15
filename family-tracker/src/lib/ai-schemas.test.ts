import assert from "node:assert/strict";
import { test } from "node:test";
import { MOCKS } from "./ai-mocks.ts";
import { distributeNutrition, FoodEstimateSchema, MenuSchema, planToRows, rescaleFoodItem, sanitizeFoodItem, SwapSchema } from "./ai-schemas.ts";

test("тестовые ответы проходят схемы", () => {
  assert.ok(FoodEstimateSchema.parse(MOCKS.food_text));
  assert.ok(MenuSchema.parse(MOCKS.menu));
  assert.ok(SwapSchema.parse(MOCKS.swap));
});

test("оценка еды: числа в допустимых пределах, пересчёт по весу", () => {
  const raw = { name: "  Плов  ", grams: 250.4, unit: "г" as const, kcal: -5, protein: 14.04, fat: 18, carbs: 50, caffeine_mg: 0, pregnancy_note: "  " };
  const s = sanitizeFoodItem(raw);
  assert.equal(s.name, "Плов");
  assert.equal(s.grams, 250);
  assert.equal(s.kcal, 0);
  assert.equal(s.protein, 14);
  assert.equal(s.pregnancy_note, null);
  const r = rescaleFoodItem({ ...s, kcal: 420 }, 125);
  assert.equal(r.kcal, 210);
  assert.equal(r.grams, 125);
  assert.equal(r.fat, 9);
});

test("КБЖУ блюда раскладывается по ингредиентам и даёт ту же порцию", () => {
  const d = distributeNutrition({
    servings: 4,
    kcal_per_serving: 500,
    protein: 30,
    fat: 20,
    carbs: 50,
    ingredients: [
      { name: "Рис", amount: 400, unit: "г", department: "Бакалея" },
      { name: "Морковь", amount: 2, unit: "шт", department: "Овощи и фрукты" },
      { name: " ", amount: 10, unit: "г", department: "Другое" },
    ],
  });
  assert.equal(d.ingredients.length, 2);
  const kcal = d.ingredients.reduce((s, i) => s + i.kcal, 0);
  assert.ok(Math.abs(kcal / d.servings - 500) < 1);
  assert.ok(d.ingredients[0].kcal > d.ingredients[1].kcal);
});

test("план: только известные блюда и выбранные приёмы, без повторов слотов", () => {
  const days = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"];
  const rows = planToRows(
    {
      dishes: [{ key: "a" }, { key: "b" }] as never,
      plan: [
        { day: 0, meal: "lunch", dish_key: "a" },
        { day: 0, meal: "lunch", dish_key: "b" },
        { day: 1, meal: "snack", dish_key: "a" },
        { day: 7, meal: "lunch", dish_key: "a" },
        { day: 2, meal: "dinner", dish_key: "zzz" },
        { day: 6, meal: "dinner", dish_key: "b" },
      ],
    },
    days,
    ["breakfast", "lunch", "dinner"],
  );
  assert.deepEqual(rows, [
    { date: "2026-10-05", meal: "lunch", dish_key: "a" },
    { date: "2026-10-11", meal: "dinner", dish_key: "b" },
  ]);
});
