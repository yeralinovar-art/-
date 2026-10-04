import assert from "node:assert/strict";
import { test } from "node:test";
import {
  afterChoreDone,
  assigneeLabel,
  dailyStreak,
  dueLabel,
  everyLabel,
  goalPercent,
  inView,
  planProgress,
  sortTasks,
  streakLabel,
  weeklyStreak,
} from "./tasks.ts";

const today = "2026-10-07"; // среда

test("виды задач: сегодня, неделя, просрочено", () => {
  const t = (due_date: string | null, status: "todo" | "done" = "todo") => ({ due_date, status });
  assert.equal(inView(t("2026-10-05"), "overdue", today), true);
  assert.equal(inView(t("2026-10-05"), "today", today), true); // просроченное видно и в «Сегодня»
  assert.equal(inView(t("2026-10-07"), "overdue", today), false);
  assert.equal(inView(t("2026-10-13"), "week", today), true);
  assert.equal(inView(t("2026-10-14"), "week", today), false);
  assert.equal(inView(t(null), "today", today), false);
  assert.equal(inView(t(null), "all", today), true);
  assert.equal(inView(t("2026-10-05", "done"), "overdue", today), false);
});

test("сортировка: по сроку, затем важные, без даты в конце", () => {
  const list = sortTasks([
    { id: "a", due_date: null, priority: 1 as const, created_at: "1" },
    { id: "b", due_date: "2026-10-08", priority: 2 as const, created_at: "1" },
    { id: "c", due_date: "2026-10-08", priority: 1 as const, created_at: "2" },
    { id: "d", due_date: "2026-10-01", priority: 3 as const, created_at: "1" },
  ]);
  assert.deepEqual(list.map((t) => t.id), ["d", "c", "b", "a"]);
});

test("подписи срока и ответственного", () => {
  assert.deepEqual(dueLabel("2026-10-04", today), { text: "просрочено 3 дн.", tone: "danger" });
  assert.deepEqual(dueLabel("2026-10-06", today), { text: "вчера", tone: "danger" });
  assert.equal(dueLabel("2026-10-07", today)?.text, "сегодня");
  assert.equal(dueLabel("2026-10-08", today)?.text, "завтра");
  assert.equal(dueLabel("2026-11-15", today)?.text, "15 ноя");
  assert.equal(assigneeLabel({ shared: true, assignee_id: null }, "me", "Алмас"), "оба");
  assert.equal(assigneeLabel({ shared: true, assignee_id: "p" }, "me", "Алмас"), "Алмас");
  assert.equal(assigneeLabel({ shared: false, assignee_id: null }, "me", "Алмас"), null);
});

test("прогресс плана и цели", () => {
  assert.deepEqual(planProgress([{ status: "done" }, { status: "todo" }, { status: "doing" }]), { done: 1, total: 3, pct: 33 });
  assert.deepEqual(planProgress([]), { done: 0, total: 0, pct: 0 });
  assert.equal(goalPercent(3, 12), 25);
  assert.equal(goalPercent(15, 12), 100);
  assert.equal(goalPercent(3, null), null);
});

test("серия дней: сегодня ещё не отмечено — серия держится", () => {
  const d = new Set(["2026-10-04", "2026-10-05", "2026-10-06"]);
  assert.equal(dailyStreak(d, today), 3);
  d.add(today);
  assert.equal(dailyStreak(d, today), 4);
  assert.equal(dailyStreak(new Set(["2026-10-05"]), today), 0); // пропуск вчера
  assert.equal(streakLabel(4, "daily"), "4 дня подряд");
  assert.equal(streakLabel(11, "daily"), "11 дней подряд");
  assert.equal(streakLabel(21, "weekly"), "21 неделя подряд");
});

test("серия недель «3 раза в неделю»", () => {
  const d = new Set([
    "2026-09-21", "2026-09-23", "2026-09-25", // неделя 21.09 — 3
    "2026-09-28", "2026-09-30", "2026-10-02", // неделя 28.09 — 3
    "2026-10-05", // эта неделя — пока 1
  ]);
  assert.equal(weeklyStreak(d, 3, today), 2);
  d.add("2026-10-06");
  d.add("2026-10-07");
  assert.equal(weeklyStreak(d, 3, today), 3);
});

test("дела по очереди: срок от сегодня, очередь ко второму", () => {
  const chore = { every_days: 7, rotate: true, assignee_id: "r" };
  assert.deepEqual(afterChoreDone(chore, "r", ["r", "a"], today), { next_due: "2026-10-14", assignee_id: "a" });
  assert.deepEqual(afterChoreDone(chore, "a", ["r", "a"], today), { next_due: "2026-10-14", assignee_id: "r" });
  assert.deepEqual(afterChoreDone({ ...chore, rotate: false }, "a", ["r", "a"], today), { next_due: "2026-10-14", assignee_id: "r" });
  assert.deepEqual(afterChoreDone(chore, "r", ["r"], today), { next_due: "2026-10-14", assignee_id: "r" });
  assert.equal(everyLabel(1), "каждый день");
  assert.equal(everyLabel(3), "каждые 3 дн.");
});
