import assert from "node:assert/strict";
import { test } from "node:test";
import { foodSearchPatterns, rankFoods } from "./search.ts";

const matches = (query: string, name: string) =>
  foodSearchPatterns(query).every((p) => new RegExp(p, "i").test(name.toLowerCase()));

test("мягкий поиск по-русски", () => {
  assert.ok(matches("кофе с молоком", "Кофе с молоком"));
  assert.ok(matches("кофе молоко", "Кофе с молоком и сахаром"));
  assert.ok(matches("чай черный", "Чай чёрный"));
  assert.ok(matches("Плов", "Плов с бараниной"));
  assert.ok(matches("баурсак", "Баурсаки"));
  assert.ok(matches("сырники", "Сырники"));
  assert.ok(!matches("кофе молоко", "Кофе американо"));
  assert.deepEqual(foodSearchPatterns("  "), []);
});

test("свои блюда и совпадения с начала — выше", () => {
  const ranked = rankFoods(
    [
      { name: "Чай с молоком", family_id: null },
      { name: "Молоко 2,5%", family_id: null },
      { name: "Мамино молоко", family_id: "f1" },
    ],
    "молоко",
  ).map((f) => f.name);
  assert.deepEqual(ranked, ["Мамино молоко", "Молоко 2,5%", "Чай с молоком"]);
});
