import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_HEALTH_PROFILE,
  ageOn,
  dailyKcalTarget,
  gainCorridorAtWeek,
  goalProgress,
  iomTotalGain,
  mifflinBmr,
  movingAverage7,
  pregnancyOn,
  sharpWeightChange,
} from "./health.ts";

test("возраст считается с учётом дня рождения", () => {
  assert.equal(ageOn("1995-10-05", "2026-10-04"), 30);
  assert.equal(ageOn("1995-10-04", "2026-10-04"), 31);
});

test("Миффлин — Сан Жеор", () => {
  // 10*60 + 6.25*165 − 5*30 − 161 = 1320.25
  assert.equal(mifflinBmr("female", 60, 165, 30), 1320.25);
  // 10*80 + 6.25*180 − 5*35 + 5 = 1755
  assert.equal(mifflinBmr("male", 80, 180, 35), 1755);
});

test("срок беременности по ПДР", () => {
  // ПДР через 140 дней → 140 дней срока = 20 недель 0 дней, II триместр
  const p = pregnancyOn("2027-02-21", "2026-10-04");
  assert.deepEqual(p && { w: p.weeks, d: p.days, t: p.trimester }, { w: 20, d: 0, t: 2 });
  assert.equal(pregnancyOn("2027-06-20", "2026-10-04")?.trimester, 1); // 6 недель... в пределах
  assert.equal(pregnancyOn("2026-12-01", "2026-10-04")?.trimester, 3);
  assert.equal(pregnancyOn("2028-01-01", "2026-10-04"), null); // ещё не началась
});

test("коридор IOM", () => {
  assert.deepEqual(iomTotalGain(22), { min: 11.5, max: 16 });
  assert.deepEqual(iomTotalGain(17), { min: 12.5, max: 18 });
  const w13 = gainCorridorAtWeek(13, { min: 11.5, max: 16 });
  assert.deepEqual(w13, { min: 0.5, max: 2 });
  const w40 = gainCorridorAtWeek(40, { min: 11.5, max: 16 });
  assert.deepEqual(w40, { min: 11.5, max: 16 });
});

test("норма при беременности: без дефицита, плюс надбавка триместра", () => {
  const profile = {
    ...DEFAULT_HEALTH_PROFILE,
    sex: "female" as const,
    birth_date: "1996-01-01",
    height_cm: 165,
    activity_level: "light" as const,
    is_pregnant: true,
    due_date: "2027-02-21", // II триместр на 2026-10-04
    pre_pregnancy_weight_kg: 60,
    goal_weight_kg: 50, // цель на похудение должна игнорироваться
  };
  const t = dailyKcalTarget(profile, 66, "2026-10-04");
  assert.ok(t);
  assert.equal(t.basis, "pregnancy");
  assert.equal(t.pregnancyBonus, 340);
  // BMR по весу до беременности: 10*60 + 6.25*165 − 5*30 − 161 = 1320.25; ×1.375 + 340 ≈ 2155
  assert.equal(t.kcal, 2160);
});

test("норма без беременности: дефицит при цели на снижение, не ниже BMR", () => {
  const profile = {
    ...DEFAULT_HEALTH_PROFILE,
    sex: "male" as const,
    birth_date: "1991-01-01",
    height_cm: 180,
    activity_level: "sedentary" as const,
    goal_weight_kg: 75,
  };
  const t = dailyKcalTarget(profile, 85, "2026-10-04");
  assert.ok(t);
  assert.equal(t.basis, "loss");
  assert.ok(t.kcal >= (t.bmr ?? 0) - 10);
});

test("ручная норма и нехватка данных", () => {
  assert.equal(dailyKcalTarget({ ...DEFAULT_HEALTH_PROFILE, kcal_target_override: 2100 }, null, "2026-10-04")?.kcal, 2100);
  assert.equal(dailyKcalTarget(DEFAULT_HEALTH_PROFILE, 70, "2026-10-04"), null);
});

test("скользящее среднее за 7 дней", () => {
  const avg = movingAverage7([
    { date: "2026-10-01", kg: 60 },
    { date: "2026-10-02", kg: 62 },
    { date: "2026-10-09", kg: 64 },
  ]);
  assert.deepEqual(avg.map((p) => p.avg), [60, 61, 64]);
});

test("прогресс к цели", () => {
  assert.equal(goalProgress(90, 85, 80), 50);
  assert.equal(goalProgress(90, 95, 80), 0);
  assert.equal(goalProgress(90, 78, 80), 100);
});

test("предупреждение о резком изменении веса", () => {
  const pts = [
    { date: "2026-09-27", kg: 60 },
    { date: "2026-10-04", kg: 61.5 },
  ];
  assert.equal(sharpWeightChange(pts, true), 1.5);
  assert.equal(sharpWeightChange(pts, false), null);
});

test("статус веса при беременности", async () => {
  const { pregnancyWeightStatus } = await import("./health.ts");
  const p = {
    ...DEFAULT_HEALTH_PROFILE,
    sex: "female" as const,
    height_cm: 165,
    is_pregnant: true,
    due_date: "2027-01-31", // ровно 23 недели на 2026-10-04
    pre_pregnancy_weight_kg: 60,
  };
  const s = pregnancyWeightStatus(p, 64.5, "2026-10-04");
  assert.ok(s);
  assert.equal(s.week, 23);
  assert.equal(s.gainKg, 4.5);
  // ИМТ 22 → 11,5–16; к 23-й неделе: 0,5 + 11×10/27 ≈ 4,57
  assert.equal(s.targetKg, 64.6);
  assert.equal(s.status, "in");
  assert.equal(pregnancyWeightStatus(p, 64, "2026-10-04")?.status, "below"); // +4 кг < 4,57 − 0,3
});
