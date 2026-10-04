// Учёт времени по проектам и чтение. Чистые функции — без обращения к базе.

import { addDays } from "./health.ts";
import { weekStartOf } from "./menu.ts";

export const PROJECT_KINDS = [
  { value: "work", label: "Работа" },
  { value: "hobby", label: "Хобби" },
] as const;
export type ProjectKind = (typeof PROJECT_KINDS)[number]["value"];

export type Project = { id: string; name: string; kind: ProjectKind; color_slot: number; archived: boolean };
export type TimeEntry = { id: string; project_id: string; started_at: string; ended_at: string | null; note: string | null };

/** Свободный цвет для нового проекта: первый незанятый слот по порядку палитры. */
export function nextColorSlot(used: number[]): number {
  for (let s = 1; s <= 8; s++) if (!used.includes(s)) return s;
  return (used.length % 8) + 1;
}

export function entryMinutes(e: Pick<TimeEntry, "started_at" | "ended_at">, nowMs: number): number {
  const end = e.ended_at ? Date.parse(e.ended_at) : nowMs;
  return Math.max(0, Math.round((end - Date.parse(e.started_at)) / 60000));
}

/** «1 ч 25 мин», «40 мин», «2 ч». */
export function formatMinutes(total: number): string {
  const m = Math.round(total);
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest} мин`;
  return rest ? `${h} ч ${rest} мин` : `${h} ч`;
}

/** Секундомер: «0:05:09». */
export function formatClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Дата начала записи по Алматы (UTC+5). */
export function localDate(iso: string): string {
  return new Date(Date.parse(iso) + 5 * 3600_000).toISOString().slice(0, 10);
}

/** Начало дня по Алматы в ISO — для ручного ввода «за день» и границ периодов. */
export function dayStartIso(date: string): string {
  return new Date(Date.parse(`${date}T00:00:00+05:00`)).toISOString();
}

export type Period = "week" | "month";

export function periodRange(period: Period, today: string): { from: string; to: string } {
  if (period === "week") {
    const from = weekStartOf(today);
    return { from, to: addDays(from, 6) };
  }
  const from = `${today.slice(0, 7)}-01`;
  const [y, m] = today.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return { from, to: addDays(next, -1) };
}

/** Минуты по проектам за период (по дате начала записи), по убыванию. */
export function totalsByProject(
  entries: Pick<TimeEntry, "project_id" | "started_at" | "ended_at">[],
  from: string,
  to: string,
  nowMs: number,
): { project_id: string; minutes: number }[] {
  const map = new Map<string, number>();
  for (const e of entries) {
    const d = localDate(e.started_at);
    if (d < from || d > to) continue;
    map.set(e.project_id, (map.get(e.project_id) ?? 0) + entryMinutes(e, nowMs));
  }
  return [...map.entries()]
    .map(([project_id, minutes]) => ({ project_id, minutes }))
    .filter((t) => t.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);
}

// ---------------------------------------------------------------------------
// Чтение
// ---------------------------------------------------------------------------

export type ReadingSession = { id: string; book_id: string | null; read_on: string; started_at: string | null; minutes: number | null };

export function readingByDay(sessions: Pick<ReadingSession, "read_on" | "minutes">[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of sessions) if (s.minutes) map.set(s.read_on, (map.get(s.read_on) ?? 0) + s.minutes);
  return map;
}

/** Серия дней с выполненной целью чтения; сегодня ещё можно успеть. */
export function readingStreak(byDay: Map<string, number>, goal: number, today: string): number {
  const met = (d: string) => (byDay.get(d) ?? 0) >= goal;
  let day = met(today) ? today : addDays(today, -1);
  let n = 0;
  while (met(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

export function sumBetween(byDay: Map<string, number>, from: string, to: string): number {
  let total = 0;
  for (const [d, m] of byDay) if (d >= from && d <= to) total += m;
  return total;
}

export function bookPercent(current: number, total: number | null): number | null {
  if (!total) return null;
  return Math.min(100, Math.round((current / total) * 100));
}

export const BOOK_STATUSES = [
  { value: "reading", label: "Читаю" },
  { value: "want", label: "Хочу прочитать" },
  { value: "done", label: "Прочитано" },
] as const;
export type BookStatus = (typeof BOOK_STATUSES)[number]["value"];
