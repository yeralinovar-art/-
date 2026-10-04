// Меню семьи: рецепты, порции, список покупок. Чистые функции — без обращения к базе.

export const DEPARTMENTS = [
  "Овощи и фрукты",
  "Мясо и птица",
  "Рыба",
  "Молочное и яйца",
  "Хлеб и выпечка",
  "Бакалея",
  "Заморозка",
  "Сладкое и снеки",
  "Напитки",
  "Другое",
] as const;
export type Department = (typeof DEPARTMENTS)[number];

export function isDepartment(v: unknown): v is Department {
  return DEPARTMENTS.includes(v as Department);
}

export type IngredientUnit = "г" | "мл" | "шт";
export const INGREDIENT_UNITS: IngredientUnit[] = ["г", "мл", "шт"];

export type Ingredient = {
  name: string;
  amount: number | null;
  unit: IngredientUnit;
  /** КБЖУ на всё количество ингредиента. */
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  department: string | null;
  pregnancy_warning: string | null;
};

export type Nutrition = { kcal: number; protein: number; fat: number; carbs: number };

const r1 = (n: number) => Math.round(n * 10) / 10;

/** КБЖУ одной порции: сумма ингредиентов, делённая на число порций рецепта. */
export function perServing(ingredients: Pick<Ingredient, keyof Nutrition>[], servings: number): Nutrition {
  const s = servings > 0 ? servings : 1;
  const sum = ingredients.reduce(
    (t, i) => ({ kcal: t.kcal + i.kcal, protein: t.protein + i.protein, fat: t.fat + i.fat, carbs: t.carbs + i.carbs }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0 },
  );
  return { kcal: Math.round(sum.kcal / s), protein: r1(sum.protein / s), fat: r1(sum.fat / s), carbs: r1(sum.carbs / s) };
}

export function scaleNutrition(n: Nutrition, k: number): Nutrition {
  return { kcal: Math.round(n.kcal * k), protein: r1(n.protein * k), fat: r1(n.fat * k), carbs: r1(n.carbs * k) };
}

/** Порция ребёнка: до года — своя еда, до 7 лет — половина взрослой, дальше — целая. */
export function kidPortion(birthDate: string | null, today: string): number {
  if (!birthDate) return 0.5;
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  const months = (ty - by) * 12 + (tm - bm) - (td < bd ? 1 : 0);
  if (months < 12) return 0;
  return months < 84 ? 0.5 : 1;
}

/** Сколько порций готовить по умолчанию: взрослые по одной, дети — по возрасту. */
export function defaultServings(adults: number, kidBirthDates: (string | null)[], today: string): number {
  const total = adults + kidBirthDates.reduce((s, b) => s + kidPortion(b, today), 0);
  return Math.max(1, total);
}

/** Количество, удобное для покупки: округляем вверх. */
export function roundUpAmount(amount: number, unit: IngredientUnit): number {
  if (unit === "шт") return Math.ceil(amount - 1e-9);
  const step = amount >= 1000 ? 50 : amount >= 100 ? 10 : 5;
  return Math.ceil(amount / step - 1e-9) * step;
}

/** Количество ингредиента для нужного числа порций (для показа в рецепте). */
export function scaleAmount(amount: number | null, factor: number, unit: IngredientUnit): number | null {
  if (amount === null) return null;
  const v = amount * factor;
  if (unit === "шт") return Math.round(v * 2) / 2 || 0.5;
  return v >= 20 ? Math.round(v / 5) * 5 : r1(v);
}

const nf = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 1 });

export function amountLabel(amount: number | null, unit: string | null): string {
  if (amount === null) return "";
  if (unit === "г" && amount >= 1000) return `${nf(amount / 1000)} кг`;
  if (unit === "мл" && amount >= 1000) return `${nf(amount / 1000)} л`;
  return `${nf(amount)} ${unit ?? ""}`.trim();
}

const DEPARTMENT_WORDS: [Department, string[]][] = [
  ["Мясо и птица", ["мяс", "говяд", "баран", "конин", "куриц", "курин", "бедр", "окорочк", "индей", "фарш", "филе", "колбас", "сосис", "казы", " печень "]],
  ["Рыба", ["рыб", "лосос", "треск", "сельд", "кревет", "тунец", "скумбр"]],
  ["Молочное и яйца", ["молок", "кефир", "творог", "сыр", "сметан", "йогурт", "масло слив", "яйц", "яйк", "сливк", "айран", "курт", "катык"]],
  ["Овощи и фрукты", ["лук", "морков", "картоф", "картош", "капуст", "помид", "томат", "огур", "перец", "свекл", "свёкл", "чеснок", "зелен", "укроп", "петруш", "яблок", "банан", "груш", "лимон", "апельс", "мандар", "виноград", "тыкв", "кабач", "баклаж", "ягод", "фрукт", "овощ", "салат", "авокадо", "хурм"]],
  ["Хлеб и выпечка", ["хлеб", "батон", "лепеш", "лаваш", "булк", "баурсак"]],
  ["Бакалея", ["мук", "рис", "греч", "овся", "макарон", "лапш", "спагет", "сахар", "соль", "масло раст", "масло олив", "круп", "чечев", "фасол", "горох", "специ", "перец мол", "чай", "кофе", "паста", "соус", "уксус", "дрожж", "сод"]],
  ["Заморозка", ["заморож", "пельмен", "манты", "морожен"]],
  ["Сладкое и снеки", ["шокол", "конфет", "печень", "вафл", "орех", "сухофр", "изюм", "кураг", "мёд", "мед ", "варень"]],
  ["Напитки", ["сок", "вода", "компот", "морс", "напит"]],
];

/** Отдел магазина по названию — для пунктов, добавленных вручную. */
export function guessDepartment(name: string): Department {
  const n = ` ${name.toLowerCase().replace(/ё/g, "е")} `;
  for (const [dep, words] of DEPARTMENT_WORDS) {
    if (words.some((w) => n.includes(w.replace(/ё/g, "е")))) return dep;
  }
  return "Другое";
}

// Что обычно есть дома — в список не попадает.
const PANTRY = new Set(["соль", "вода"]);

export type PlannedDish = {
  /** Сколько порций готовим. */
  servings: number;
  recipe: { servings: number; ingredients: Pick<Ingredient, "name" | "amount" | "unit" | "department">[] } | null;
};

export type ShoppingNeed = { name: string; amount: number | null; unit: IngredientUnit | null; department: Department };

const key = (name: string, unit: string | null) => `${name.trim().toLowerCase().replace(/ё/g, "е")}|${unit ?? ""}`;

/** Список покупок по меню: одинаковые продукты складываются, количество округляется вверх. */
export function aggregateShopping(dishes: PlannedDish[]): ShoppingNeed[] {
  const map = new Map<string, ShoppingNeed>();
  for (const d of dishes) {
    if (!d.recipe) continue;
    const factor = d.servings / (d.recipe.servings > 0 ? d.recipe.servings : 1);
    for (const i of d.recipe.ingredients) {
      if (PANTRY.has(i.name.trim().toLowerCase())) continue;
      const k = key(i.name, i.unit);
      const add = i.amount === null ? null : i.amount * factor;
      const prev = map.get(k);
      if (prev) {
        prev.amount = prev.amount === null ? add : add === null ? prev.amount : prev.amount + add;
      } else {
        map.set(k, {
          name: i.name.trim(),
          amount: add,
          unit: i.unit,
          department: isDepartment(i.department) ? i.department : guessDepartment(i.name),
        });
      }
    }
  }
  return [...map.values()]
    .map((n) => ({ ...n, amount: n.amount === null || n.unit === null ? n.amount : roundUpAmount(n.amount, n.unit) }))
    .sort((a, b) => DEPARTMENTS.indexOf(a.department) - DEPARTMENTS.indexOf(b.department) || a.name.localeCompare(b.name, "ru"));
}

export type ShoppingItem = {
  id: string;
  name: string;
  amount: number | null;
  unit: IngredientUnit | null;
  department: string;
  checked: boolean;
  source: "menu" | "manual";
  week_start: string | null;
};

/**
 * Пересборка списка из меню недели. Невычеркнутые пункты прошлой сборки этой недели заменяются;
 * купленное и добавленное вручную остаётся, и такие продукты повторно не добавляются.
 */
export function planShoppingSync(existing: ShoppingItem[], needs: ShoppingNeed[], weekStart: string) {
  const remove = existing.filter((i) => i.source === "menu" && i.week_start === weekStart && !i.checked);
  const removeIds = new Set(remove.map((i) => i.id));
  const keep = existing.filter((i) => !removeIds.has(i.id));
  const boughtThisWeek = new Set(keep.filter((i) => i.source === "menu" && i.week_start === weekStart).map((i) => key(i.name, i.unit)));
  const manualNames = new Set(keep.filter((i) => i.source === "manual" && !i.checked).map((i) => key(i.name, null).split("|")[0]));
  const insert = needs.filter((n) => !boughtThisWeek.has(key(n.name, n.unit)) && !manualNames.has(key(n.name, null).split("|")[0]));
  return { removeIds: [...removeIds], insert };
}

/** Предупреждения для беременных из ингредиентов — без повторов. */
export function pregnancyWarnings(ingredients: Pick<Ingredient, "name" | "pregnancy_warning">[]): string[] {
  const out = new Map<string, string[]>();
  for (const i of ingredients) {
    if (!i.pregnancy_warning) continue;
    const list = out.get(i.pregnancy_warning) ?? [];
    list.push(i.name);
    out.set(i.pregnancy_warning, list);
  }
  return [...out.entries()].map(([w, names]) => `${names.join(", ")}: ${w.charAt(0).toLowerCase()}${w.slice(1)}`);
}

/** Понедельник недели, в которую попадает дата (YYYY-MM-DD). */
export function weekStartOf(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${start}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

const WEEKDAY_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

export function dayLabel(date: string): { short: string; day: number; long: string } {
  const d = new Date(`${date}T00:00:00Z`);
  const short = WEEKDAY_SHORT[(d.getUTCDay() + 6) % 7];
  return { short, day: d.getUTCDate(), long: `${d.getUTCDate()} ${MONTHS_GEN[d.getUTCMonth()]}` };
}

export function weekLabel(start: string): string {
  const days = weekDays(start);
  const a = dayLabel(days[0]);
  const b = dayLabel(days[6]);
  return a.long.split(" ")[1] === b.long.split(" ")[1] ? `${a.day}–${b.long}` : `${a.long} – ${b.long}`;
}

/** Траты по периодам: эта неделя, этот месяц, прошлый месяц. */
export function spendTotals(rows: { spent_on: string; amount: number }[], today: string) {
  const week = weekStartOf(today);
  const month = today.slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const prevMonth = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  let w = 0;
  let cur = 0;
  let prev = 0;
  for (const r of rows) {
    if (r.spent_on >= week && r.spent_on <= today) w += r.amount;
    if (r.spent_on.startsWith(month)) cur += r.amount;
    if (r.spent_on.startsWith(prevMonth)) prev += r.amount;
  }
  return { week: w, month: cur, prevMonth: prev, prevMonthKey: prevMonth };
}

export function tenge(n: number): string {
  return `${Math.round(n).toLocaleString("ru-RU")} ₸`;
}

/** Название продукта для рецепта: «Рис (сухой)» → «Рис». */
export function ingredientName(foodName: string): string {
  return foodName.replace(/ \((сыр|сух|для )[^)]*\)$/, "");
}
