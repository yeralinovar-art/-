import assert from "node:assert/strict";
import { test } from "node:test";
import { burnedKcal, estimateKcal, kcalLeft, quoteOfDay, sharedWorkoutStreak, stepsPercent, workoutDaysInRange } from "./activity.ts";

test("расход по MET и баланс без двойного счёта", () => {
  assert.equal(estimateKcal("walk", 60, 70), 245);
  assert.equal(estimateKcal("yoga", 30, null), 81);
  assert.equal(burnedKcal(200, 350), 350);
  assert.equal(burnedKcal(200, null), 200);
  assert.equal(kcalLeft(2200, 1500, 300), 1000);
  assert.equal(stepsPercent(6000, 8000), 75);
  assert.equal(stepsPercent(12000, 8000), 100);
});

test("тренировок за неделю — по дням", () => {
  assert.equal(workoutDaysInRange(["2026-10-05", "2026-10-05", "2026-10-07", "2026-10-12"], "2026-10-05", "2026-10-11"), 2);
});

test("общая серия: нужны оба; пропуск «плохо себя чувствую» засчитан", () => {
  const logs = [
    { user_id: "r", log_date: "2026-10-05" }, { user_id: "a", log_date: "2026-10-05" },
    { user_id: "r", log_date: "2026-10-06" }, { user_id: "a", log_date: "2026-10-06" }, // r — пропуск, тоже лог
    { user_id: "r", log_date: "2026-10-07" },
  ];
  assert.equal(sharedWorkoutStreak(logs, ["r", "a"], "2026-10-07"), 2); // сегодня муж ещё может успеть
  assert.equal(sharedWorkoutStreak([...logs, { user_id: "a", log_date: "2026-10-07" }], ["r", "a"], "2026-10-07"), 3);
  assert.equal(sharedWorkoutStreak(logs, ["r"], "2026-10-07"), 3);
  assert.equal(sharedWorkoutStreak(logs, ["r", "a"], "2026-10-09"), 0);
});

test("цитата дня: общая база по кругу, свои — каждый 4-й день и только со следующего дня", () => {
  const common = Array.from({ length: 5 }, (_, i) => ({ id: `c${i + 1}`, text: String(i), author: null, ord: i + 1, created_at: "2026-01-01T00:00:00Z" }));
  // 2026-10-04 — день 20730: 20730 % 5 = 0 → c1; 20730 % 4 = 2 — не «семейный» день.
  assert.equal(quoteOfDay(common, "2026-10-04")?.id, "c1");
  assert.equal(quoteOfDay(common, "2026-10-05")?.id, "c2");
  const ownToday = { id: "own", text: "своя", author: null, ord: null, created_at: "2026-10-06T10:00:00Z" };
  // 2026-10-06 — день 20732, 20732 % 4 = 0: «семейный» день, но цитату добавили сегодня — пока не берём.
  assert.equal(quoteOfDay([...common, ownToday], "2026-10-06")?.id, "c3");
  assert.equal(quoteOfDay(common, "2026-10-06")?.id, "c3");
  // Через 4 дня — семейный день, своя цитата уже в очереди.
  assert.equal(quoteOfDay([...common, ownToday], "2026-10-10")?.id, "own");
  // Добавление своей цитаты не меняет цитату обычного дня.
  assert.equal(quoteOfDay([...common, ownToday], "2026-10-07")?.id, quoteOfDay(common, "2026-10-07")?.id);
  assert.equal(quoteOfDay([], "2026-10-04"), null);
});
