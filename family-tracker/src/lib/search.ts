// Мягкий поиск блюд по-русски: без окончаний, «е» = «ё», короткие слова («с», «на») не мешают.

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е");

/** Основа слова: отбрасываем окончание, чтобы «молоком» находило «молоко». */
export function stem(word: string): string {
  const w = norm(word);
  if (w.length >= 6) return w.slice(0, -2);
  if (w.length === 5) return w.slice(0, -1);
  return w;
}

/** Регулярные выражения (POSIX, без учёта регистра) для каждого значимого слова запроса. */
export function foodSearchPatterns(query: string): string[] {
  return norm(query)
    .split(/[^a-zа-я0-9%]+/i)
    .filter((w) => w.length >= 2 && !["на", "из", "со", "по", "без"].includes(w))
    .slice(0, 4)
    .map((w) => stem(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/е/g, "[её]"));
}

/** Сначала свои блюда семьи, потом названия, начинающиеся с запроса, потом остальные. */
export function rankFoods<T extends { name: string; family_id: string | null }>(foods: T[], query: string): T[] {
  const first = stem(norm(query).split(/\s+/)[0] ?? "");
  const score = (f: T) => (f.family_id ? 0 : 2) + (norm(f.name).startsWith(first) ? 0 : 1);
  return [...foods].sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name, "ru"));
}
