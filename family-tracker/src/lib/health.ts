// Расчёты здоровья: норма калорий, беременность, коридор набора веса.
// Чистые функции без зависимостей — их проверяют тесты в health.test.ts.
// Даты — строки YYYY-MM-DD (день по Алматы, см. lib/time.ts).

export type Sex = "female" | "male";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";

export const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; factor: number }[] = [
  { value: "sedentary", label: "Почти не двигаюсь", factor: 1.2 },
  { value: "light", label: "Лёгкая активность (прогулки)", factor: 1.375 },
  { value: "moderate", label: "Средняя (тренировки 3–5 раз в неделю)", factor: 1.55 },
  { value: "active", label: "Высокая (тренировки почти каждый день)", factor: 1.725 },
  { value: "very_active", label: "Очень высокая (физический труд)", factor: 1.9 },
];

export type HealthProfile = {
  sex: Sex | null;
  birth_date: string | null;
  height_cm: number | null;
  activity_level: ActivityLevel;
  kcal_target_override: number | null;
  goal_weight_kg: number | null;
  goal_date: string | null;
  water_goal_ml: number;
  is_pregnant: boolean;
  due_date: string | null;
  pre_pregnancy_weight_kg: number | null;
  gain_min_kg: number | null;
  gain_max_kg: number | null;
  tri1_bonus_kcal: number;
  tri2_bonus_kcal: number;
  tri3_bonus_kcal: number;
  caffeine_limit_mg: number;
};

export const DEFAULT_HEALTH_PROFILE: HealthProfile = {
  sex: null,
  birth_date: null,
  height_cm: null,
  activity_level: "light",
  kcal_target_override: null,
  goal_weight_kg: null,
  goal_date: null,
  water_goal_ml: 2000,
  is_pregnant: false,
  due_date: null,
  pre_pregnancy_weight_kg: null,
  gain_min_kg: null,
  gain_max_kg: null,
  tri1_bonus_kcal: 0,
  tri2_bonus_kcal: 340,
  tri3_bonus_kcal: 450,
  caffeine_limit_mg: 200,
};

const DAY_MS = 86_400_000;

/** Число дней между датами YYYY-MM-DD (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export function ageOn(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Беременность
// ---------------------------------------------------------------------------

export type Pregnancy = {
  /** Полных недель беременности (акушерский срок). */
  weeks: number;
  /** Дней сверх полных недель. */
  days: number;
  trimester: 1 | 2 | 3;
  daysLeft: number;
};

/** Срок по предполагаемой дате родов (ПДР = 40 недель). */
export function pregnancyOn(dueDate: string, today: string): Pregnancy | null {
  const gestationDays = 280 - daysBetween(today, dueDate);
  if (gestationDays < 0 || gestationDays > 44 * 7) return null;
  const weeks = Math.floor(gestationDays / 7);
  return {
    weeks,
    days: gestationDays % 7,
    trimester: weeks < 14 ? 1 : weeks < 28 ? 2 : 3,
    daysLeft: Math.max(0, daysBetween(today, dueDate)),
  };
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

/** Рекомендации IOM (2009): набор за всю беременность по ИМТ до беременности, кг. */
export function iomTotalGain(preBmi: number): { min: number; max: number } {
  if (preBmi < 18.5) return { min: 12.5, max: 18 };
  if (preBmi < 25) return { min: 11.5, max: 16 };
  if (preBmi < 30) return { min: 7, max: 11.5 };
  return { min: 5, max: 9 };
}

/**
 * Коридор набора к данной неделе, кг от веса до беременности.
 * I триместр: 0,5–2 кг к 13-й неделе; дальше равномерно до итогового коридора к 40-й.
 */
export function gainCorridorAtWeek(week: number, total: { min: number; max: number }) {
  const w = Math.max(0, Math.min(week, 40));
  if (w <= 13) return { min: (0.5 * w) / 13, max: (2 * w) / 13 };
  const k = (w - 13) / 27;
  return { min: 0.5 + (total.min - 0.5) * k, max: 2 + (total.max - 2) * k };
}

// ---------------------------------------------------------------------------
// Калории
// ---------------------------------------------------------------------------

/** Базовый обмен по Миффлину — Сан Жеору, ккал. */
export function mifflinBmr(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === "male" ? 5 : -161);
}

export type KcalTarget = {
  kcal: number;
  /** Как получена норма — показываем пользователю. */
  basis: "manual" | "pregnancy" | "loss" | "gain" | "maintain";
  bmr: number | null;
  tdee: number | null;
  pregnancyBonus: number;
};

/**
 * Дневная норма. При беременности — без дефицита: расход по весу до беременности + надбавка триместра.
 * Возвращает null, если не хватает данных (пол, рост, дата рождения, вес).
 */
export function dailyKcalTarget(
  p: HealthProfile,
  currentWeightKg: number | null,
  today: string,
): KcalTarget | null {
  const preg = p.is_pregnant && p.due_date ? pregnancyOn(p.due_date, today) : null;
  const bonus = preg
    ? [p.tri1_bonus_kcal, p.tri2_bonus_kcal, p.tri3_bonus_kcal][preg.trimester - 1]
    : 0;

  if (p.kcal_target_override) {
    return { kcal: p.kcal_target_override, basis: "manual", bmr: null, tdee: null, pregnancyBonus: 0 };
  }

  const weight = preg ? (p.pre_pregnancy_weight_kg ?? currentWeightKg) : currentWeightKg;
  if (!p.sex || !p.height_cm || !p.birth_date || !weight) return null;

  const bmr = mifflinBmr(p.sex, weight, p.height_cm, ageOn(p.birth_date, today));
  const factor = ACTIVITY_LEVELS.find((a) => a.value === p.activity_level)?.factor ?? 1.375;
  const tdee = bmr * factor;

  if (preg) {
    return { kcal: round10(tdee + bonus), basis: "pregnancy", bmr, tdee, pregnancyBonus: bonus };
  }
  if (p.goal_weight_kg && currentWeightKg && p.goal_weight_kg < currentWeightKg - 0.5) {
    // Умеренный дефицит 15%, но не ниже базового обмена.
    return { kcal: round10(Math.max(tdee * 0.85, bmr)), basis: "loss", bmr, tdee, pregnancyBonus: 0 };
  }
  if (p.goal_weight_kg && currentWeightKg && p.goal_weight_kg > currentWeightKg + 0.5) {
    return { kcal: round10(tdee * 1.1), basis: "gain", bmr, tdee, pregnancyBonus: 0 };
  }
  return { kcal: round10(tdee), basis: "maintain", bmr, tdee, pregnancyBonus: 0 };
}

function round10(n: number) {
  return Math.round(n / 10) * 10;
}

/** Ориентир по БЖУ: белок 20%, жиры 30%, углеводы 50% калорий, г. */
export function macroTargets(kcal: number) {
  return {
    protein: Math.round((kcal * 0.2) / 4),
    fat: Math.round((kcal * 0.3) / 9),
    carbs: Math.round((kcal * 0.5) / 4),
  };
}

// ---------------------------------------------------------------------------
// Вес
// ---------------------------------------------------------------------------

export type WeightPoint = { date: string; kg: number };

/** Скользящее среднее за 7 календарных дней (по имеющимся записям в окне). */
export function movingAverage7(points: WeightPoint[]): (WeightPoint & { avg: number })[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((p) => {
    const window = sorted.filter((q) => {
      const d = daysBetween(q.date, p.date);
      return d >= 0 && d < 7;
    });
    const avg = window.reduce((s, q) => s + q.kg, 0) / window.length;
    return { ...p, avg: Math.round(avg * 100) / 100 };
  });
}

/** Прогресс к цели по весу, 0–100%. */
export function goalProgress(startKg: number, currentKg: number, goalKg: number): number {
  if (startKg === goalKg) return 100;
  const pct = ((startKg - currentKg) / (startKg - goalKg)) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

/**
 * Мягкое предупреждение о резком изменении веса за последнюю неделю.
 * Беременность: больше 1 кг в неделю в любую сторону. Иначе: больше 2 кг.
 */
export function sharpWeightChange(points: WeightPoint[], pregnant: boolean): number | null {
  if (points.length < 2) return null;
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1];
  const prev = [...sorted]
    .reverse()
    .find((p) => daysBetween(p.date, last.date) >= 5 && daysBetween(p.date, last.date) <= 9);
  if (!prev) return null;
  const perWeek = ((last.kg - prev.kg) / daysBetween(prev.date, last.date)) * 7;
  return Math.abs(perWeek) > (pregnant ? 1 : 2) ? Math.round(perWeek * 10) / 10 : null;
}

/** Итоговый коридор набора: по врачу, если задан, иначе IOM по ИМТ до беременности. */
export function totalGainCorridor(p: HealthProfile): { min: number; max: number } | null {
  if (p.gain_min_kg !== null && p.gain_max_kg !== null) return { min: p.gain_min_kg, max: p.gain_max_kg };
  if (!p.pre_pregnancy_weight_kg || !p.height_cm) return null;
  const iom = iomTotalGain(bmi(p.pre_pregnancy_weight_kg, p.height_cm));
  return { min: p.gain_min_kg ?? iom.min, max: p.gain_max_kg ?? iom.max };
}

export type PregnancyWeightStatus = {
  week: number;
  gainKg: number;
  /** Коридор набора к текущей неделе, кг от веса до беременности. */
  corridor: { min: number; max: number };
  /** Целевой вес на сегодня — нижняя граница коридора («минимальный набор»). */
  targetKg: number;
  status: "below" | "in" | "above";
};

export function pregnancyWeightStatus(
  p: HealthProfile,
  currentKg: number,
  today: string,
): PregnancyWeightStatus | null {
  if (!p.is_pregnant || !p.due_date || !p.pre_pregnancy_weight_kg) return null;
  const preg = pregnancyOn(p.due_date, today);
  const total = totalGainCorridor(p);
  if (!preg || !total) return null;
  const corridor = gainCorridorAtWeek(preg.weeks, total);
  const gainKg = Math.round((currentKg - p.pre_pregnancy_weight_kg) * 10) / 10;
  return {
    week: preg.weeks,
    gainKg,
    corridor,
    targetKg: Math.round((p.pre_pregnancy_weight_kg + corridor.min) * 10) / 10,
    status: gainKg < corridor.min - 0.3 ? "below" : gainKg > corridor.max + 0.3 ? "above" : "in",
  };
}

/** Число с запятой, как принято в русском: 62,4 */
export function fmt(n: number, digits = 1): string {
  return n.toLocaleString("ru-RU", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}
