// Активность, баланс калорий, серия мини-тренировок и цитата дня. Чистые функции.

import { addDays } from "./health.ts";
import { dayNumber } from "./workouts.ts";

export const ACTIVITY_KINDS = [
  { value: "walk", label: "Прогулка", met: 3.5, emoji: "🚶" },
  { value: "run", label: "Бег", met: 9, emoji: "🏃" },
  { value: "gym", label: "Зал / силовая", met: 5, emoji: "🏋️" },
  { value: "yoga", label: "Йога / растяжка", met: 2.5, emoji: "🧘" },
  { value: "swim", label: "Плавание", met: 6, emoji: "🏊" },
  { value: "bike", label: "Велосипед", met: 6.8, emoji: "🚴" },
  { value: "dance", label: "Танцы", met: 5, emoji: "💃" },
  { value: "mini", label: "Мини-тренировка", met: 4, emoji: "⏱️" },
  { value: "other", label: "Другое", met: 4, emoji: "✨" },
] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number]["value"];

export function isActivityKind(v: unknown): v is ActivityKind {
  return ACTIVITY_KINDS.some((k) => k.value === v);
}

export function kindInfo(kind: string) {
  return ACTIVITY_KINDS.find((k) => k.value === kind) ?? ACTIVITY_KINDS[ACTIVITY_KINDS.length - 1];
}

/** Оценка расхода: MET × вес × часы. Без веса берём 65 кг. */
export function estimateKcal(kind: ActivityKind, minutes: number, weightKg: number | null): number {
  return Math.round(kindInfo(kind).met * (weightKg ?? 65) * (minutes / 60));
}

/**
 * Сожжено за день. Активные ккал из «Здоровья» уже включают тренировки,
 * поэтому берём большее из двух — чтобы не посчитать дважды.
 */
export function burnedKcal(activitiesKcal: number, activeKcalFromSteps: number | null): number {
  return Math.max(activitiesKcal, activeKcalFromSteps ?? 0);
}

/** Сколько ещё можно съесть: норма + сожжённое − съеденное. */
export function kcalLeft(target: number, eaten: number, burned: number): number {
  return Math.round(target + burned - eaten);
}

/** Тренировок за неделю (дни с хотя бы одной тренировкой). */
export function workoutDaysInRange(dates: string[], from: string, to: string): number {
  return new Set(dates.filter((d) => d >= from && d <= to)).size;
}

/**
 * Общая серия мини-тренировки: день засчитан, когда отметились все члены семьи
 * («сделано» или «плохо себя чувствую — пропустить»). Сегодня ещё можно успеть.
 */
export function sharedWorkoutStreak(logs: { user_id: string; log_date: string }[], members: string[], today: string): number {
  const byDay = new Map<string, Set<string>>();
  for (const l of logs) {
    if (!byDay.has(l.log_date)) byDay.set(l.log_date, new Set());
    byDay.get(l.log_date)!.add(l.user_id);
  }
  const complete = (d: string) => members.every((m) => byDay.get(d)?.has(m));
  let day = complete(today) ? today : addDays(today, -1);
  let n = 0;
  while (complete(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

export type Quote = { id: string; text: string; author: string | null; ord: number | null; created_at: string };

/**
 * Цитата дня — одна на семью, меняется только в полночь по Алматы.
 * Обычно — из общей базы по кругу; каждый 4-й день — своя цитата семьи
 * (если есть). Свои цитаты попадают в очередь со следующего дня, чтобы
 * добавление новой не меняло цитату посреди дня.
 */
export function quoteOfDay<T extends Quote>(quotes: T[], date: string): T | null {
  const n = dayNumber(date);
  const dayStart = Date.parse(`${date}T00:00:00+05:00`);
  const common = quotes.filter((q) => q.ord !== null).sort((a, b) => (a.ord ?? 0) - (b.ord ?? 0));
  const own = quotes
    .filter((q) => q.ord === null && Date.parse(q.created_at) < dayStart)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (own.length && (n % 4 === 0 || !common.length)) return own[Math.floor(n / 4) % own.length];
  return common.length ? common[n % common.length] : null;
}

export function stepsPercent(steps: number, goal: number): number {
  return goal > 0 ? Math.min(100, Math.round((steps / goal) * 100)) : 0;
}
