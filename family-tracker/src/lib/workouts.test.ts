import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSteps, EXERCISES, resolveExercise, totalMinutes, workoutForDay, workoutKcal, WORKOUTS } from "./workouts.ts";

// Чего не должно быть в версии для беременных.
const UNSAFE_PREGNANCY = ["glute_bridge", "crunches", "bicycle", "russian_twist", "superman", "jumping_jacks", "high_knees", "mountain_climbers", "burpees", "skaters", "pushups", "knee_pushups", "plank", "side_plank", "lunges"];
const UNSAFE_T3 = [...UNSAFE_PREGNANCY, "incline_plank", "split_squats", "wall_sit", "dips", "squats"];

test("библиотека: 24 тренировки, все упражнения и замены существуют", () => {
  assert.equal(WORKOUTS.length, 24);
  assert.equal(new Set(WORKOUTS.map((w) => w.key)).size, 24);
  for (const w of WORKOUTS) for (const k of w.main) assert.ok(EXERCISES[k], `${w.key}: нет упражнения ${k}`);
  for (const [k, e] of Object.entries(EXERCISES)) {
    if (e.pregnancyAlt) assert.ok(EXERCISES[e.pregnancyAlt], `${k}: замена ${e.pregnancyAlt}`);
    if (e.t3Alt) assert.ok(EXERCISES[e.t3Alt], `${k}: замена T3 ${e.t3Alt}`);
  }
});

test("обычная тренировка 10–15 минут, при беременности короче и мягче", () => {
  for (const w of WORKOUTS) {
    const reg = totalMinutes(buildSteps(w, "regular", null));
    const preg = totalMinutes(buildSteps(w, "pregnancy", 2));
    assert.ok(reg >= 10 && reg <= 15, `${w.key}: ${reg} мин`);
    assert.ok(preg >= 8 && preg <= 12, `${w.key}: ${preg} мин`);
  }
});

test("версия для беременных: нет прыжков, лёжа на спине, скручиваний; в III триместре — ещё мягче", () => {
  for (const w of WORKOUTS) {
    for (const t of [1, 2]) {
      const keys = buildSteps(w, "pregnancy", t).map((s) => s.key);
      for (const bad of UNSAFE_PREGNANCY) assert.ok(!keys.includes(bad), `${w.key} T${t}: ${bad}`);
    }
    const t3 = buildSteps(w, "pregnancy", 3).map((s) => s.key);
    for (const bad of UNSAFE_T3) assert.ok(!t3.includes(bad), `${w.key} T3: ${bad}`);
  }
  assert.equal(resolveExercise("lunges", "pregnancy", 2), "split_squats");
  assert.equal(resolveExercise("lunges", "pregnancy", 3), "chair_squats");
  assert.equal(resolveExercise("lunges", "regular", null), "lunges");
});

test("одна тренировка на день для обоих, по кругу", () => {
  assert.equal(workoutForDay("2026-10-04").key, workoutForDay("2026-10-04").key);
  assert.notEqual(workoutForDay("2026-10-04").key, workoutForDay("2026-10-05").key);
  const keys = new Set(Array.from({ length: 24 }, (_, i) => workoutForDay(new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10)).key));
  assert.equal(keys.size, 24);
  assert.equal(workoutKcal(15, "regular"), 105);
  assert.equal(workoutKcal(11, "pregnancy"), 44);
});
