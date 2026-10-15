import { test } from "node:test";
import assert from "node:assert/strict";
import { buildHealthPayload, importSummary, parseNumber, workoutKind } from "./health-import.ts";

test("parseNumber: числа в разных видах из «Команд»", () => {
  assert.equal(parseNumber(8123), 8123);
  assert.equal(parseNumber("8 123"), 8123);
  assert.equal(parseNumber("8 123 шага"), 8123);
  assert.equal(parseNumber("71,4 кг"), 71.4);
  assert.equal(parseNumber("412.6 ккал"), 412.6);
  assert.equal(parseNumber(""), null);
  assert.equal(parseNumber("нет"), null);
  assert.equal(parseNumber(null), null);
  assert.equal(parseNumber(Number.NaN), null);
});

test("buildHealthPayload: шаги суммируются, вес — последний, мусор пропускается", () => {
  const p = buildHealthPayload({ steps: ["3 000", "5 123"], active_kcal: "412,4 ккал", weight_kg: ["70,9", "71,36 кг"], date: "2026-10-15T21:00:00+05:00" });
  assert.deepEqual(p, { date: "2026-10-15", steps: 8123, active_kcal: 412, weight_kg: 71.4 });
  assert.deepEqual(buildHealthPayload({ steps: "", weight_kg: "5", date: "вчера" }), {});
  assert.deepEqual(buildHealthPayload({ steps: -5 }), {});
});

test("buildHealthPayload: тренировки с типом и стабильным id", () => {
  const p = buildHealthPayload({
    date: "2026-10-15",
    workouts: [
      { name: "Ходьба", minutes: "35,5", kcal: "150 ккал", start: "2026-10-15 08:00" },
      { name: "Traditional Strength Training", minutes: 700, kcal: 9999, external_id: "abc" },
      { name: "Пусто", minutes: 0 },
      "мусор",
    ],
  });
  assert.deepEqual(p.workouts, [
    { kind: "walk", minutes: 36, kcal: 150, name: "Ходьба", external_id: "2026-10-15:2026-10-15 08:00:Ходьба" },
    { kind: "gym", minutes: 600, kcal: 5000, name: "Traditional Strength Training", external_id: "abc" },
  ]);
});

test("workoutKind: русские и английские названия", () => {
  assert.equal(workoutKind("Running"), "run");
  assert.equal(workoutKind("Бег на улице"), "run");
  assert.equal(workoutKind("Yoga"), "yoga");
  assert.equal(workoutKind("Пилатес"), "yoga");
  assert.equal(workoutKind("Плавание в бассейне"), "swim");
  assert.equal(workoutKind("Велоспорт"), "bike");
  assert.equal(workoutKind("Танцы"), "dance");
  assert.equal(workoutKind("Теннис"), "other");
});

test("importSummary", () => {
  assert.equal(importSummary({ steps: 8123, weight_kg: 71.4 }), "Готово: 8 123 шагов, 71,4 кг");
  assert.equal(importSummary({}), "Данных нет — проверьте поля в команде");
});
