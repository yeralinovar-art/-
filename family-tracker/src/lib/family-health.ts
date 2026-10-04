// Типы и чистые функции для роста ребёнка, прививок и визитов. Тесты — family-health.test.ts.

export type GrowthEntry = {
  id: string;
  child_id: string;
  measured_on: string;
  height_cm: number | null;
  weight_kg: number | null;
  note: string | null;
};

export type Vaccine = {
  id: string;
  child_id: string;
  name: string;
  planned_on: string | null;
  given_on: string | null;
  note: string | null;
};

export type VisitKind = "doctor" | "ultrasound" | "tests" | "other";

export const VISIT_KINDS: { value: VisitKind; label: string }[] = [
  { value: "doctor", label: "Приём врача" },
  { value: "ultrasound", label: "УЗИ" },
  { value: "tests", label: "Анализы" },
  { value: "other", label: "Другое" },
];

export type Visit = {
  id: string;
  owner_id: string | null;
  child_id: string | null;
  kind: VisitKind;
  title: string;
  visit_date: string;
  visit_time: string | null;
  place: string | null;
  questions: string | null;
  result: string | null;
  done: boolean;
};

/** Частые прививки — подсказки в форме. Точный график — в прививочном сертификате у педиатра. */
export const VACCINE_SUGGESTIONS = [
  "БЦЖ",
  "Гепатит B",
  "АКДС-ИПВ-Hib-ГепB (гекса)",
  "АКДС-ИПВ-Hib",
  "Пневмококк (ПКВ)",
  "Полиомиелит (ОПВ)",
  "Корь, краснуха, паротит (ККП)",
  "Ветряная оспа",
  "Гепатит A",
  "Грипп",
  "АДС-М",
];

/** Возраст ребёнка: «2 года 4 мес.» на дату today. */
export function childAge(birth: string, today: string): string {
  const [by, bm, bd] = birth.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  let months = (ty - by) * 12 + (tm - bm) - (td < bd ? 1 : 0);
  if (months < 0) return "";
  const years = Math.floor(months / 12);
  months %= 12;
  const yWord = (n: number) => {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return "год";
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "года";
    return "лет";
  };
  const y = years ? `${years} ${yWord(years)}` : "";
  const m = months ? `${months} мес.` : "";
  return [y, m].filter(Boolean).join(" ") || "меньше месяца";
}

export type VaccineStatus = "done" | "overdue" | "soon" | "planned";

/** Статус прививки: сделана, просрочена, в ближайшие 14 дней или запланирована. */
export function vaccineStatus(v: Pick<Vaccine, "planned_on" | "given_on">, today: string): VaccineStatus {
  if (v.given_on) return "done";
  if (!v.planned_on) return "planned";
  if (v.planned_on < today) return "overdue";
  const days = (Date.parse(v.planned_on) - Date.parse(today)) / 86_400_000;
  return days <= 14 ? "soon" : "planned";
}

/** Ближайшие визиты: не завершённые, от сегодня до +days, по дате и времени. */
export function upcomingVisits(visits: Visit[], today: string, days: number): Visit[] {
  const until = new Date(Date.parse(`${today}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
  return visits
    .filter((v) => !v.done && v.visit_date >= today && v.visit_date <= until)
    .sort((a, b) => `${a.visit_date} ${a.visit_time ?? "99"}`.localeCompare(`${b.visit_date} ${b.visit_time ?? "99"}`));
}

/** Прибавка с предыдущего замера: «+0,4 кг, +2 см». */
export function growthDelta(entries: GrowthEntry[]): { kg: number | null; cm: number | null } | null {
  const sorted = [...entries].sort((a, b) => a.measured_on.localeCompare(b.measured_on));
  if (sorted.length < 2) return null;
  const last = sorted[sorted.length - 1];
  const prevWith = (key: "weight_kg" | "height_cm") =>
    [...sorted.slice(0, -1)].reverse().find((e) => e[key] !== null)?.[key] ?? null;
  const pk = prevWith("weight_kg");
  const ph = prevWith("height_cm");
  return {
    kg: last.weight_kg !== null && pk !== null ? Math.round((last.weight_kg - pk) * 100) / 100 : null,
    cm: last.height_cm !== null && ph !== null ? Math.round((last.height_cm - ph) * 10) / 10 : null,
  };
}
