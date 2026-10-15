"use client";

import { useActionState } from "react";
import { Sparkles } from "lucide-react";
import { FormMessage, NumberField, SelectField, SubmitButton, TextField, Toggle } from "@/components/ui";
import { generateMenu, type MenuAiState } from "../ai-actions";

const nf = (n: number) => String(n).replace(".", ",");

const MEALS = [
  { value: "breakfast", label: "Завтрак" },
  { value: "lunch", label: "Обед" },
  { value: "dinner", label: "Ужин" },
  { value: "snack", label: "Перекус" },
];

export function MenuAiForm({
  weeks,
  servings,
  kcalMe,
  partnerName,
  pregnant,
}: {
  weeks: { value: string; label: string }[];
  servings: number;
  kcalMe: number | null;
  partnerName: string | null;
  pregnant: boolean;
}) {
  const [state, action] = useActionState<MenuAiState, FormData>(generateMenu, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <SelectField label="Неделя" name="week" options={weeks} />
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium text-muted">Приёмы пищи</legend>
        <div className="grid grid-cols-2 gap-2">
          {MEALS.map((m) => (
            <label key={m.value} className="flex min-h-11 items-center gap-2 rounded-2xl bg-card px-3 shadow-sm">
              <input type="checkbox" name={`meal_${m.value}`} defaultChecked={m.value !== "snack"} className="size-5 accent-[var(--accent)]" />
              {m.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Порций на приём" name="eaters" defaultValue={nf(servings)} hint="взрослые + дети ½" />
        <NumberField label="Готовка, до" name="minutes" defaultValue="45" inputMode="numeric" suffix="мин" />
      </div>
      <NumberField label="Бюджет на неделю" name="budget" inputMode="numeric" suffix="₸" placeholder="например 40 000" />
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Мои ккал в день" name="kcal_me" inputMode="numeric" defaultValue={kcalMe ? String(kcalMe) : ""} />
        <NumberField label={partnerName ? `${partnerName}, ккал` : "Ккал партнёра"} name="kcal_partner" inputMode="numeric" hint="если знаете" />
      </div>
      <TextField label="Не использовать" name="exclude" placeholder="грибы, свинина, острое…" maxLength={300} />
      <TextField label="Пожелания" name="wishes" placeholder="побольше супов, рыба 2 раза, быстрые завтраки…" maxLength={500} />
      <Toggle label="Безопасно при беременности" description="Без сырой рыбы, недожаренного мяса, сырых яиц и т. п." name="pregnancy" defaultChecked={pregnant} />
      <Toggle label="Заменить всё меню недели" description="Иначе AI заполнит только пустые места" name="replace" />
      <FormMessage message={state.error ? { type: "error", text: state.error } : undefined} />
      <SubmitButton pendingText="AI составляет меню… это займёт 1–3 минуты">
        <span className="inline-flex items-center gap-2">
          <Sparkles className="size-5" aria-hidden />
          Составить меню и список покупок
        </span>
      </SubmitButton>
      <p className="text-xs text-muted">
        Новые блюда сохранятся в «Наши рецепты» — их можно поправить. Список покупок соберётся сам. Рекомендации не заменяют консультацию врача.
      </p>
    </form>
  );
}
