import assert from "node:assert/strict";
import { test } from "node:test";
import { dueDoses, isoWeekday, normalizeTime, scheduleLabel, type Medication } from "./meds.ts";

const med = (over: Partial<Medication>): Medication => ({
  id: "m",
  owner_id: "u",
  child_id: null,
  name: "Витамин D",
  dose: null,
  times: ["08:00"],
  weekdays: null,
  note: null,
  start_date: "2026-01-01",
  end_date: null,
  archived: false,
  ...over,
});

test("день недели ISO", () => {
  assert.equal(isoWeekday("2026-10-04"), 7); // воскресенье
  assert.equal(isoWeekday("2026-10-05"), 1); // понедельник
});

test("приёмы на день: по воскресеньям, утром и вечером, архив и даты", () => {
  const meds = [
    med({ id: "d-sun", name: "Витамин D", weekdays: [7], times: ["09:00"] }),
    med({ id: "iron", name: "Ранферон", times: ["20:00", "08:00"] }),
    med({ id: "old", name: "Старое", archived: true }),
    med({ id: "later", name: "С понедельника", start_date: "2026-10-05" }),
  ];
  const sunday = dueDoses(meds, [], "2026-10-04").map((d) => `${d.slot} ${d.med.name}`);
  assert.deepEqual(sunday, ["08:00 Ранферон", "09:00 Витамин D", "20:00 Ранферон"]);
  const monday = dueDoses(meds, [], "2026-10-05").map((d) => d.med.name);
  assert.deepEqual(monday, ["Ранферон", "С понедельника", "Ранферон"]);
});

test("отметка приёма привязана к дате и времени", () => {
  const meds = [med({ id: "iron", times: ["08:00", "20:00"] })];
  const doses = [{ medication_id: "iron", dose_date: "2026-10-04", slot: "08:00", taken_at: "", taken_by: "u" }];
  const due = dueDoses(meds, doses, "2026-10-04");
  assert.equal(due[0].taken?.slot, "08:00");
  assert.equal(due[1].taken, null);
  assert.equal(dueDoses(meds, doses, "2026-10-05")[0].taken, null);
});

test("подписи расписания и время", () => {
  assert.equal(scheduleLabel({ times: ["09:00"], weekdays: [7] }), "по воскресеньям · 09:00");
  assert.equal(scheduleLabel({ times: ["20:00", "08:00"], weekdays: null }), "каждый день · 08:00, 20:00");
  assert.equal(scheduleLabel({ times: ["08:00"], weekdays: [1, 3, 5] }), "пн, ср, пт · 08:00");
  assert.equal(normalizeTime("8:00"), "08:00");
  assert.equal(normalizeTime("20.30"), "20:30");
  assert.equal(normalizeTime("25:00"), null);
});
