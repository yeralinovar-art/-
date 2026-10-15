// Разбор данных, которые присылает iOS-команда из «Здоровья». Чистые функции.
// «Команды» отправляют числа по-разному: 8123, "8 123", "71,4 кг", ["412 ккал"] —
// принимаем всё это и собираем аккуратный объект для health_import в базе.

export type HealthWorkout = { kind: string; minutes: number; kcal: number | null; name: string | null; external_id: string };
export type HealthPayload = {
  date?: string;
  steps?: number;
  active_kcal?: number;
  weight_kg?: number;
  workouts?: HealthWorkout[];
};

/** Первое число из значения: 8123, "8 123", "71,4 кг". Иначе null. */
export function parseNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const m = value.replace(/[\s  ]/g, "").replace(",", ".").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

/** Сумма списка (шаги и ккал могут прийти по частям) или одно число. */
function sumOf(value: unknown): number | null {
  if (!Array.isArray(value)) return parseNumber(value);
  const nums = value.map(parseNumber).filter((n): n is number => n !== null);
  return nums.length ? nums.reduce((a, b) => a + b, 0) : null;
}

/** Вес — последнее значение, если пришёл список. */
function lastOf(value: unknown): number | null {
  if (!Array.isArray(value)) return parseNumber(value);
  const nums = value.map(parseNumber).filter((n): n is number => n !== null);
  return nums.length ? nums[nums.length - 1] : null;
}

const KIND_WORDS: [string, RegExp][] = [
  ["walk", /walk|hik|ходьб|прогул|поход/i],
  ["run", /run|бег/i],
  ["gym", /strength|functional|core|hiit|cross|силов|функц|зал/i],
  ["yoga", /yoga|pilates|stretch|flexib|mind|йог|пилат|растяж/i],
  ["swim", /swim|плав/i],
  ["bike", /cycl|bik|вело/i],
  ["dance", /danc|танц/i],
];

/** Тип тренировки из названия в «Здоровье» (английского или русского). */
export function workoutKind(name: string): string {
  return KIND_WORDS.find(([, re]) => re.test(name))?.[0] ?? "other";
}

function dateOf(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const m = value.match(/^\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : undefined;
}

/** Тело запроса → данные для базы. Пустые и мусорные поля просто пропускаются. */
export function buildHealthPayload(body: Record<string, unknown>): HealthPayload {
  const out: HealthPayload = {};
  const date = dateOf(body.date);
  if (date) out.date = date;

  const steps = sumOf(body.steps);
  if (steps !== null && steps >= 0) out.steps = Math.round(steps);
  const active = sumOf(body.active_kcal);
  if (active !== null && active >= 0) out.active_kcal = Math.round(active);
  const weight = lastOf(body.weight_kg);
  if (weight !== null && weight >= 30 && weight <= 300) out.weight_kg = Math.round(weight * 10) / 10;

  if (Array.isArray(body.workouts)) {
    const workouts: HealthWorkout[] = [];
    for (const [i, w] of body.workouts.slice(0, 20).entries()) {
      if (!w || typeof w !== "object") continue;
      const r = w as Record<string, unknown>;
      const minutes = parseNumber(r.minutes);
      if (minutes === null || minutes < 1) continue;
      const name = typeof r.name === "string" ? r.name.trim().slice(0, 200) : "";
      const kcal = parseNumber(r.kcal);
      const start = typeof r.start === "string" ? r.start : "";
      const externalId =
        typeof r.external_id === "string" && r.external_id.trim()
          ? r.external_id.trim().slice(0, 120)
          : `${date ?? "today"}:${start || i}:${name}`.slice(0, 120);
      workouts.push({
        kind: typeof r.kind === "string" && r.kind ? workoutKind(r.kind) : workoutKind(name),
        minutes: Math.round(Math.min(600, minutes)),
        kcal: kcal === null ? null : Math.round(Math.max(0, Math.min(5000, kcal))),
        name: name || null,
        external_id: externalId,
      });
    }
    if (workouts.length) out.workouts = workouts;
  }
  return out;
}

/** Короткий итог для ответа команде (его видно, если добавить «Показать результат»). */
export function importSummary(p: HealthPayload): string {
  const parts = [
    p.steps !== undefined && `${p.steps.toLocaleString("ru-RU")} шагов`,
    p.active_kcal !== undefined && `${p.active_kcal} акт. ккал`,
    p.weight_kg !== undefined && `${p.weight_kg.toLocaleString("ru-RU")} кг`,
    p.workouts?.length && `тренировок: ${p.workouts.length}`,
  ].filter(Boolean);
  return parts.length ? `Готово: ${parts.join(", ")}` : "Данных нет — проверьте поля в команде";
}
