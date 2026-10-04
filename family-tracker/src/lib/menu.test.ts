import assert from "node:assert/strict";
import { test } from "node:test";
import {
  aggregateShopping,
  amountLabel,
  defaultServings,
  guessDepartment,
  perServing,
  planShoppingSync,
  pregnancyWarnings,
  roundUpAmount,
  scaleAmount,
  spendTotals,
  weekDays,
  weekLabel,
  weekStartOf,
  type ShoppingItem,
} from "./menu.ts";

test("КБЖУ на порцию", () => {
  const n = perServing(
    [
      { kcal: 1870, protein: 189, fat: 124, carbs: 0 },
      { kcal: 1376, protein: 26.8, fat: 2.8, carbs: 315.6 },
    ],
    4,
  );
  assert.deepEqual(n, { kcal: 812, protein: 54, fat: 31.7, carbs: 78.9 });
  assert.equal(perServing([], 0).kcal, 0);
});

test("порции семьи: двое взрослых и дочка 2 лет — 2,5", () => {
  assert.equal(defaultServings(2, ["2024-05-17"], "2026-10-04"), 2.5);
  assert.equal(defaultServings(2, ["2026-03-01"], "2026-10-04"), 2); // младенец ест своё
  assert.equal(defaultServings(1, [], "2026-10-04"), 1);
});

test("округление для покупок и масштаб рецепта", () => {
  assert.equal(roundUpAmount(312.5, "г"), 320);
  assert.equal(roundUpAmount(1210, "г"), 1250);
  assert.equal(roundUpAmount(42, "мл"), 45);
  assert.equal(roundUpAmount(1.25, "шт"), 2);
  assert.equal(roundUpAmount(2, "шт"), 2);
  assert.equal(scaleAmount(500, 2.5 / 4, "г"), 315);
  assert.equal(scaleAmount(1, 2.5 / 6, "шт"), 0.5);
  assert.equal(scaleAmount(10, 0.5, "г"), 5);
  assert.equal(scaleAmount(null, 2, "г"), null);
  assert.equal(amountLabel(1500, "г"), "1,5 кг");
  assert.equal(amountLabel(750, "мл"), "750 мл");
  assert.equal(amountLabel(null, "г"), "");
});

test("отдел по названию", () => {
  assert.equal(guessDepartment("Молоко 3,2%"), "Молочное и яйца");
  assert.equal(guessDepartment("Яблоки"), "Овощи и фрукты");
  assert.equal(guessDepartment("Куриные бёдра"), "Мясо и птица");
  assert.equal(guessDepartment("Курага"), "Сладкое и снеки");
  assert.equal(guessDepartment("Печенье"), "Сладкое и снеки");
  assert.equal(guessDepartment("Хлеб бородинский"), "Хлеб и выпечка");
  assert.equal(guessDepartment("Подгузники"), "Другое");
});

test("список покупок: складываем по продукту, масштабируем, соль не берём", () => {
  const plov = {
    servings: 6,
    ingredients: [
      { name: "Рис", amount: 500, unit: "г" as const, department: "Бакалея" },
      { name: "Лук репчатый", amount: 200, unit: "г" as const, department: "Овощи и фрукты" },
      { name: "Соль", amount: 15, unit: "г" as const, department: "Бакалея" },
    ],
  };
  const soup = {
    servings: 4,
    ingredients: [
      { name: "лук репчатый", amount: 80, unit: "г" as const, department: null },
      { name: "Яйцо куриное", amount: 1, unit: "шт" as const, department: "Молочное и яйца" },
      { name: "Зелень", amount: null, unit: "г" as const, department: null },
    ],
  };
  const list = aggregateShopping([
    { servings: 3, recipe: plov },
    { servings: 2.5, recipe: soup },
    { servings: 2.5, recipe: soup },
    { servings: 2, recipe: null },
  ]);
  assert.deepEqual(list, [
    { name: "Зелень", amount: null, unit: "г", department: "Овощи и фрукты" },
    { name: "Лук репчатый", amount: 200, unit: "г", department: "Овощи и фрукты" },
    { name: "Яйцо куриное", amount: 2, unit: "шт", department: "Молочное и яйца" },
    { name: "Рис", amount: 250, unit: "г", department: "Бакалея" },
  ]);
});

test("пересборка списка: купленное и ручное не трогаем", () => {
  const item = (over: Partial<ShoppingItem>): ShoppingItem => ({
    id: "x", name: "Рис", amount: 250, unit: "г", department: "Бакалея", checked: false, source: "menu", week_start: "2026-10-05", ...over,
  });
  const existing = [
    item({ id: "old-menu" }),
    item({ id: "bought", name: "Лук репчатый", checked: true }),
    item({ id: "manual", name: "яйцо куриное", source: "manual", unit: null, amount: null }),
    item({ id: "other-week", name: "Мука", week_start: "2026-09-28" }),
  ];
  const needs = [
    { name: "Рис", amount: 300, unit: "г" as const, department: "Бакалея" as const },
    { name: "Лук репчатый", amount: 200, unit: "г" as const, department: "Овощи и фрукты" as const },
    { name: "Яйцо куриное", amount: 2, unit: "шт" as const, department: "Молочное и яйца" as const },
    { name: "Морковь", amount: 100, unit: "г" as const, department: "Овощи и фрукты" as const },
  ];
  const { removeIds, insert } = planShoppingSync(existing, needs, "2026-10-05");
  assert.deepEqual(removeIds, ["old-menu"]);
  assert.deepEqual(insert.map((n) => n.name), ["Рис", "Морковь"]);
});

test("предупреждения для беременных без повторов", () => {
  assert.deepEqual(
    pregnancyWarnings([
      { name: "Яйцо", pregnancy_warning: "Только после термообработки" },
      { name: "Лосось", pregnancy_warning: "Только после термообработки" },
      { name: "Рис", pregnancy_warning: null },
    ]),
    ["Яйцо, Лосось: только после термообработки"],
  );
});

test("неделя с понедельника", () => {
  assert.equal(weekStartOf("2026-10-04"), "2026-09-28"); // воскресенье
  assert.equal(weekStartOf("2026-10-05"), "2026-10-05");
  assert.deepEqual(weekDays("2026-09-28").at(-1), "2026-10-04");
  assert.equal(weekLabel("2026-10-05"), "5–11 октября");
  assert.equal(weekLabel("2026-09-28"), "28 сентября – 4 октября");
});

test("траты за неделю и месяцы", () => {
  const t = spendTotals(
    [
      { spent_on: "2026-10-04", amount: 12500 },
      { spent_on: "2026-10-01", amount: 8000 },
      { spent_on: "2026-09-27", amount: 20000 },
      { spent_on: "2026-08-31", amount: 5000 },
    ],
    "2026-10-04",
  );
  assert.deepEqual(t, { week: 20500, month: 20500, prevMonth: 20000, prevMonthKey: "2026-09" });
});
