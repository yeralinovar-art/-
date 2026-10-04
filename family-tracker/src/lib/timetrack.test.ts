import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bookPercent,
  dayStartIso,
  entryMinutes,
  formatClock,
  formatMinutes,
  localDate,
  nextColorSlot,
  periodRange,
  readingByDay,
  readingStreak,
  sumBetween,
  totalsByProject,
} from "./timetrack.ts";

test("цвет проекта: первый свободный слот", () => {
  assert.equal(nextColorSlot([]), 1);
  assert.equal(nextColorSlot([1, 2, 4]), 3);
  assert.equal(nextColorSlot([1, 2, 3, 4, 5, 6, 7, 8]), 1);
});

test("форматы времени", () => {
  assert.equal(formatMinutes(40), "40 мин");
  assert.equal(formatMinutes(85), "1 ч 25 мин");
  assert.equal(formatMinutes(120), "2 ч");
  assert.equal(formatClock(309_000), "0:05:09");
  assert.equal(formatClock(3_725_000), "1:02:05");
});

test("дата по Алматы и начало дня", () => {
  assert.equal(localDate("2026-10-04T20:30:00Z"), "2026-10-05"); // 01:30 по Алматы
  assert.equal(localDate("2026-10-04T18:59:00Z"), "2026-10-04");
  assert.equal(dayStartIso("2026-10-05"), "2026-10-04T19:00:00.000Z");
});

test("периоды: неделя с понедельника и календарный месяц", () => {
  assert.deepEqual(periodRange("week", "2026-10-07"), { from: "2026-10-05", to: "2026-10-11" });
  assert.deepEqual(periodRange("month", "2026-10-07"), { from: "2026-10-01", to: "2026-10-31" });
  assert.deepEqual(periodRange("month", "2026-12-15"), { from: "2026-12-01", to: "2026-12-31" });
  assert.deepEqual(periodRange("month", "2028-02-10"), { from: "2028-02-01", to: "2028-02-29" });
});

test("итоги по проектам, запущенный таймер считается до «сейчас»", () => {
  const now = Date.parse("2026-10-07T10:00:00Z");
  const entries = [
    { project_id: "w", started_at: "2026-10-06T04:00:00Z", ended_at: "2026-10-06T06:30:00Z" }, // 150
    { project_id: "h", started_at: "2026-10-07T09:20:00Z", ended_at: null }, // 40, идёт
    { project_id: "w", started_at: "2026-10-07T03:00:00Z", ended_at: "2026-10-07T03:45:00Z" }, // 45
    { project_id: "w", started_at: "2026-10-03T03:00:00Z", ended_at: "2026-10-03T05:00:00Z" }, // прошлая неделя
  ];
  assert.equal(entryMinutes(entries[1], now), 40);
  assert.deepEqual(totalsByProject(entries, "2026-10-05", "2026-10-11", now), [
    { project_id: "w", minutes: 195 },
    { project_id: "h", minutes: 40 },
  ]);
});

test("чтение: минуты по дням, серия по цели, итоги", () => {
  const byDay = readingByDay([
    { read_on: "2026-10-05", minutes: 15 },
    { read_on: "2026-10-05", minutes: 10 },
    { read_on: "2026-10-06", minutes: 20 },
    { read_on: "2026-10-04", minutes: 5 },
    { read_on: "2026-10-07", minutes: null },
  ]);
  assert.equal(byDay.get("2026-10-05"), 25);
  assert.equal(readingStreak(byDay, 20, "2026-10-07"), 2); // 6-е и 5-е; сегодня ещё не читали
  assert.equal(readingStreak(byDay, 30, "2026-10-07"), 0);
  assert.equal(sumBetween(byDay, "2026-10-05", "2026-10-11"), 45);
  assert.equal(bookPercent(75, 300), 25);
  assert.equal(bookPercent(10, null), null);
});
