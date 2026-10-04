"use client";

import { useActionState, useMemo, useState } from "react";
import { Check, Minus, Plus, Search } from "lucide-react";
import { FormMessage, SubmitButton, TextField } from "@/components/ui";
import type { Meal } from "@/lib/data";
import type { FormMessageState } from "@/lib/form";
import { addToPlan } from "../actions";

type RecipeOption = { id: string; title: string; kcal: number; own: boolean; minutes: number | null };

const MEAL_OPTIONS: { value: Meal; label: string }[] = [
  { value: "breakfast", label: "Завтрак" },
  { value: "lunch", label: "Обед" },
  { value: "dinner", label: "Ужин" },
  { value: "snack", label: "Перекус" },
];

const nf = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 1 });
const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е");

export function AddToPlan({
  date: initialDate,
  meal: initialMeal,
  servings: initialServings,
  recipes,
  initialRecipe,
}: {
  date: string;
  meal: Meal;
  servings: number;
  recipes: RecipeOption[];
  initialRecipe: string | null;
}) {
  const [state, action] = useActionState<FormMessageState, FormData>(addToPlan, {});
  const [date, setDate] = useState(initialDate);
  const [meal, setMeal] = useState<Meal>(initialMeal);
  const [servings, setServings] = useState(initialServings);
  const [recipeId, setRecipeId] = useState<string | null>(initialRecipe);
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    return recipes
      .filter((r) => words.every((w) => norm(r.title).includes(w)))
      .sort((a, b) => Number(b.own) - Number(a.own) || a.title.localeCompare(b.title, "ru"));
  }, [q, recipes]);
  const chosen = recipes.find((r) => r.id === recipeId) ?? null;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="meal" value={meal} />
      <input type="hidden" name="servings" value={servings} />
      <input type="hidden" name="recipe_id" value={recipeId ?? ""} />

      <TextField label="День" name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />

      <div className="grid grid-cols-4 gap-1 rounded-2xl bg-card-muted p-1">
        {MEAL_OPTIONS.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => setMeal(m.value)}
            aria-pressed={meal === m.value}
            className={`min-h-10 rounded-xl text-sm font-medium transition ${meal === m.value ? "bg-card shadow-sm" : "text-muted"}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl bg-card p-3 shadow-sm">
        <div>
          <p className="font-medium">Порций</p>
          <p className="text-xs text-muted">взрослым по 1, ребёнку до 7 лет — ½</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Меньше порций"
            onClick={() => setServings((s) => Math.max(0.5, s - 0.5))}
            className="flex size-10 items-center justify-center rounded-full bg-card-muted active:scale-95"
          >
            <Minus className="size-4" aria-hidden />
          </button>
          <span className="w-10 text-center text-lg font-semibold tabular-nums" aria-live="polite">
            {nf(servings)}
          </span>
          <button
            type="button"
            aria-label="Больше порций"
            onClick={() => setServings((s) => Math.min(30, s + 0.5))}
            className="flex size-10 items-center justify-center rounded-full bg-card-muted active:scale-95"
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      {chosen ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-accent-soft p-3">
          <div className="min-w-0">
            <p className="truncate font-semibold">{chosen.title}</p>
            <p className="text-xs text-muted">{chosen.kcal} ккал на порцию</p>
          </div>
          <button type="button" onClick={() => setRecipeId(null)} className="shrink-0 text-sm font-medium text-accent">
            Другое
          </button>
        </div>
      ) : (
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
          <ul className="flex max-h-80 flex-col divide-y divide-line overflow-y-auto rounded-2xl bg-card px-3 shadow-sm">
            {list.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => setRecipeId(r.id)} className="flex w-full items-center justify-between gap-3 py-3 text-left">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.title}</span>
                    <span className="block text-xs text-muted">
                      {r.kcal} ккал/порц.
                      {r.minutes ? ` · ${r.minutes} мин` : ""}
                      {r.own ? " · наш рецепт" : ""}
                    </span>
                  </span>
                  <Check className="size-5 shrink-0 text-line" aria-hidden />
                </button>
              </li>
            ))}
            {list.length === 0 && <li className="py-3 text-sm text-muted">Ничего не нашли — напишите блюдо ниже.</li>}
          </ul>
          <TextField
            label="Или просто напишите блюдо"
            name="title"
            placeholder="Например: пельмени, гости, кафе"
            maxLength={100}
            defaultValue={q}
            key={q}
            hint="Без рецепта калории спросим, когда отметите «Съел(а)»"
          />
        </>
      )}

      <TextField label="Заметка" name="note" placeholder="Например: дочке без лука" maxLength={200} />

      <FormMessage message={state.message} />
      <SubmitButton pendingText="Добавляю…">Добавить в меню</SubmitButton>
    </form>
  );
}
