import assert from "node:assert/strict";
import { test } from "node:test";
import { childAge, growthDelta, upcomingVisits, vaccineStatus, type Visit } from "./family-health.ts";

test("возраст ребёнка", () => {
  assert.equal(childAge("2024-05-17", "2026-10-04"), "2 года 4 мес.");
  assert.equal(childAge("2024-05-17", "2025-05-17"), "1 год");
  assert.equal(childAge("2026-09-20", "2026-10-04"), "меньше месяца");
  assert.equal(childAge("2021-01-01", "2026-10-04"), "5 лет 9 мес.");
});

test("статус прививки", () => {
  assert.equal(vaccineStatus({ planned_on: "2026-09-01", given_on: "2026-09-02" }, "2026-10-04"), "done");
  assert.equal(vaccineStatus({ planned_on: "2026-09-01", given_on: null }, "2026-10-04"), "overdue");
  assert.equal(vaccineStatus({ planned_on: "2026-10-10", given_on: null }, "2026-10-04"), "soon");
  assert.equal(vaccineStatus({ planned_on: "2026-12-01", given_on: null }, "2026-10-04"), "planned");
});

test("ближайшие визиты", () => {
  const v = (id: string, visit_date: string, visit_time: string | null, done = false): Visit => ({
    id, owner_id: "u", child_id: null, kind: "doctor", title: id, visit_date, visit_time,
    place: null, questions: null, result: null, done,
  });
  const list = [v("later", "2026-10-20", null), v("pm", "2026-10-05", "15:00"), v("am", "2026-10-05", "09:30"),
    v("past", "2026-10-01", null), v("done", "2026-10-06", null, true), v("allday", "2026-10-05", null)];
  assert.deepEqual(upcomingVisits(list, "2026-10-04", 7).map((x) => x.id), ["am", "pm", "allday"]);
});

test("прибавка роста и веса", () => {
  assert.deepEqual(
    growthDelta([
      { id: "1", child_id: "k", measured_on: "2026-08-01", height_cm: 88, weight_kg: 12.6, note: null },
      { id: "2", child_id: "k", measured_on: "2026-10-01", height_cm: 90.5, weight_kg: 13.2, note: null },
    ]),
    { kg: 0.6, cm: 2.5 },
  );
  assert.equal(growthDelta([]), null);
});
