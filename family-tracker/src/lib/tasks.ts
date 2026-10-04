// Задачи, привычки, цели и домашние дела. Чистые функции — без обращения к базе.

import { addDays, daysBetween } from "./health.ts";
import { weekStartOf } from "./menu.ts";

export type TaskStatus = "todo" | "doing" | "done";

export type Task = {
  id: string;
  owner_id: string;
  shared: boolean;
  assignee_id: string | null;
  plan_id: string | null;
  title: string;
  note: string | null;
  due_date: string | null;
  priority: 1 | 2 | 3;
  status: TaskStatus;
  done_at: string | null;
  done_by: string | null;
  created_at: string;
};

export const PRIORITIES = [
  { value: 1, label: "Важно" },
  { value: 2, label: "Обычно" },
  { value: 3, label: "Не срочно" },
] as const;

export type TaskView = "today" | "week" | "overdue" | "all";

/** Попадает ли задача в вид «Сегодня» / «Неделя» / «Просрочено». */
export function inView(task: Pick<Task, "due_date" | "status">, view: TaskView, today: string): boolean {
  if (view === "all") return task.status !== "done";
  if (task.status === "done" || !task.due_date) return false;
  if (view === "overdue") return task.due_date < today;
  if (view === "today") return task.due_date <= today;
  return task.due_date <= addDays(today, 6);
}

/** Порядок в списке: просроченные и важные выше, без даты — в конце. */
export function sortTasks<T extends Pick<Task, "due_date" | "priority" | "created_at">>(tasks: T[]): T[] {
  return [...tasks].sort(
    (a, b) =>
      (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") ||
      a.priority - b.priority ||
      a.created_at.localeCompare(b.created_at),
  );
}

const MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

export function dueLabel(due: string | null, today: string): { text: string; tone: "danger" | "accent" | "muted" } | null {
  if (!due) return null;
  const d = daysBetween(today, due);
  if (d < 0) return { text: d === -1 ? "вчера" : `просрочено ${-d} дн.`, tone: "danger" };
  if (d === 0) return { text: "сегодня", tone: "accent" };
  if (d === 1) return { text: "завтра", tone: "muted" };
  const [, m, day] = due.split("-").map(Number);
  return { text: `${day} ${MONTHS[m - 1]}`, tone: "muted" };
}

/** Кто отвечает за общую задачу — для подписи. */
export function assigneeLabel(
  task: Pick<Task, "shared" | "assignee_id">,
  me: string,
  partnerName: string | null,
): string | null {
  if (!task.shared) return null;
  if (!task.assignee_id) return "оба";
  return task.assignee_id === me ? "я" : (partnerName ?? "партнёр");
}

export function planProgress(tasks: Pick<Task, "status">[]): { done: number; total: number; pct: number } {
  const done = tasks.filter((t) => t.status === "done").length;
  return { done, total: tasks.length, pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0 };
}

// ---------------------------------------------------------------------------
// Привычки
// ---------------------------------------------------------------------------

export type Habit = {
  id: string;
  title: string;
  emoji: string;
  frequency: "daily" | "weekly";
  target_per_week: number;
  archived: boolean;
};

/** Серия дней подряд. Если сегодня ещё не отмечено — серия не обрывается до конца дня. */
export function dailyStreak(dates: Set<string>, today: string): number {
  let day = dates.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (dates.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

export function countInWeek(dates: Set<string>, weekStart: string): number {
  let n = 0;
  for (let i = 0; i < 7; i++) if (dates.has(addDays(weekStart, i))) n++;
  return n;
}

/** Серия недель, когда цель «N раз в неделю» выполнена. Текущая неделя считается, когда цель уже набрана. */
export function weeklyStreak(dates: Set<string>, target: number, today: string): number {
  let week = weekStartOf(today);
  if (countInWeek(dates, week) < target) week = addDays(week, -7);
  let n = 0;
  while (countInWeek(dates, week) >= target) {
    n++;
    week = addDays(week, -7);
  }
  return n;
}

export function habitStreak(habit: Pick<Habit, "frequency" | "target_per_week">, dates: Set<string>, today: string): number {
  return habit.frequency === "daily" ? dailyStreak(dates, today) : weeklyStreak(dates, habit.target_per_week, today);
}

export function streakLabel(n: number, frequency: Habit["frequency"]): string {
  if (n === 0) return "";
  const unit = frequency === "daily" ? ["день", "дня", "дней"] : ["неделя", "недели", "недель"];
  const m10 = n % 10;
  const m100 = n % 100;
  const form = m10 === 1 && m100 !== 11 ? unit[0] : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? unit[1] : unit[2];
  return `${n} ${form} подряд`;
}

// ---------------------------------------------------------------------------
// Цели
// ---------------------------------------------------------------------------

export function goalPercent(current: number, target: number | null): number | null {
  if (!target) return null;
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
}

// ---------------------------------------------------------------------------
// Домашние дела по очереди
// ---------------------------------------------------------------------------

export type Chore = {
  id: string;
  title: string;
  emoji: string;
  every_days: number;
  rotate: boolean;
  assignee_id: string | null;
  next_due: string;
  last_done_on: string | null;
  last_done_by: string | null;
};

/** После выполнения: следующий срок от сегодня, очередь переходит ко второму. */
export function afterChoreDone(
  chore: Pick<Chore, "every_days" | "rotate" | "assignee_id">,
  doneBy: string,
  members: string[],
  today: string,
): { next_due: string; assignee_id: string | null } {
  let assignee = chore.assignee_id;
  if (chore.rotate && members.length > 1) {
    const other = members.find((m) => m !== doneBy) ?? null;
    assignee = other;
  }
  return { next_due: addDays(today, chore.every_days), assignee_id: assignee };
}

export function everyLabel(days: number): string {
  if (days === 1) return "каждый день";
  if (days === 7) return "раз в неделю";
  if (days === 14) return "раз в 2 недели";
  if (days === 30) return "раз в месяц";
  return `каждые ${days} дн.`;
}
