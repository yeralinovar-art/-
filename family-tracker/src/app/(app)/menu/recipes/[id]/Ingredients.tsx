"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Card } from "@/components/ui";
import { amountLabel, scaleAmount, type Ingredient } from "@/lib/menu";

const nf = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 1 });

export function Ingredients({
  ingredients,
  baseServings,
  initialServings,
}: {
  ingredients: Pick<Ingredient, "name" | "amount" | "unit">[];
  baseServings: number;
  initialServings: number;
}) {
  const [servings, setServings] = useState(initialServings);
  const factor = servings / baseServings;

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-semibold">Ингредиенты</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Меньше порций"
            onClick={() => setServings((s) => Math.max(0.5, s - 0.5))}
            className="flex size-9 items-center justify-center rounded-full bg-card-muted active:scale-95"
          >
            <Minus className="size-4" aria-hidden />
          </button>
          <span className="min-w-16 text-center text-sm font-medium tabular-nums" aria-live="polite">
            {nf(servings)} порц.
          </span>
          <button
            type="button"
            aria-label="Больше порций"
            onClick={() => setServings((s) => Math.min(30, s + 0.5))}
            className="flex size-9 items-center justify-center rounded-full bg-card-muted active:scale-95"
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </div>
      </div>
      {ingredients.length ? (
        <ul className="flex flex-col divide-y divide-line">
          {ingredients.map((i, idx) => (
            <li key={idx} className="flex items-baseline justify-between gap-3 py-2">
              <span className="min-w-0">{i.name}</span>
              <span className="shrink-0 text-sm text-muted tabular-nums">
                {i.amount === null ? "по вкусу" : amountLabel(scaleAmount(i.amount, factor, i.unit), i.unit)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Ингредиенты не указаны.</p>
      )}
    </Card>
  );
}
