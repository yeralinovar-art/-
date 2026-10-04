"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChefHat, Search } from "lucide-react";

type Item = { id: string; title: string; own: boolean; kcal: number; minutes: number | null; kidFriendly: boolean; photo: string | null };

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е");

export function RecipeList({ items }: { items: Item[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    return items.filter((i) => words.every((w) => norm(i.title).includes(w)));
  }, [q, items]);
  const own = filtered.filter((i) => i.own);
  const templates = filtered.filter((i) => !i.own);

  return (
    <>
      <label className="relative flex items-center">
        <Search className="pointer-events-none absolute left-4 size-5 text-muted" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Найти рецепт"
          aria-label="Найти рецепт"
          className="min-h-12 w-full rounded-2xl border border-line bg-card pr-4 pl-12 outline-none focus:border-accent"
        />
      </label>
      <Group title="Наши рецепты" items={own} empty={q ? "Не нашли" : "Пока нет. Создайте свой или скопируйте готовый и поменяйте под себя."} />
      <Group title="Готовые рецепты" items={templates} empty="Не нашли" />
    </>
  );
}

function Group({ title, items, empty }: { title: string; items: Item[]; empty: string }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-sm font-semibold text-muted">{title}</h2>
      {items.length ? (
        <ul className="flex flex-col divide-y divide-line rounded-3xl bg-card px-4 shadow-sm">
          {items.map((r) => (
            <li key={r.id}>
              <Link href={`/menu/recipes/${r.id}`} className="flex items-center gap-3 py-3">
                {r.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- временная ссылка из хранилища
                  <img src={r.photo} alt="" className="size-12 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-card-muted text-muted">
                    <ChefHat className="size-6" aria-hidden />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate font-medium">{r.title}</span>
                  <span className="block truncate text-xs text-muted">
                    {r.kcal} ккал/порц.{r.minutes ? ` · ${r.minutes} мин` : ""}
                    {r.kidFriendly ? " · детям можно" : ""}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-1 text-sm text-muted">{empty}</p>
      )}
    </section>
  );
}
