"use client";

import { useActionState } from "react";
import { FormMessage, NumberField, SelectField, SubmitButton, TextField } from "@/components/ui";
import { ACTIVITY_KINDS } from "@/lib/activity";
import type { FormMessageState } from "@/lib/form";
import { addActivity, saveActivityGoals, saveSteps } from "./actions";

export function StepsForm({ today, steps, activeKcal }: { today: string; steps: number | null; activeKcal: number | null }) {
  const [state, action] = useActionState<FormMessageState, FormData>(saveSteps, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="date" value={today} />
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Шаги" name="steps" inputMode="numeric" defaultValue={steps === null ? "" : String(steps)} required />
        <NumberField label="Активные ккал" name="active_kcal" inputMode="numeric" defaultValue={activeKcal === null ? "" : String(activeKcal)} hint="из «Здоровья», если есть" />
      </div>
      <FormMessage message={state.message} />
      <SubmitButton variant="secondary" pendingText="…">
        Сохранить шаги
      </SubmitButton>
    </form>
  );
}

export function ActivityForm({ today }: { today: string }) {
  const [state, action] = useActionState<FormMessageState, FormData>(addActivity, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <SelectField
        label="Что"
        name="kind"
        defaultValue="walk"
        options={ACTIVITY_KINDS.filter((k) => k.value !== "mini").map((k) => ({ value: k.value, label: `${k.emoji} ${k.label}` }))}
      />
      <div className="grid grid-cols-3 gap-3">
        <NumberField label="Минут" name="minutes" inputMode="numeric" required />
        <NumberField label="Ккал" name="kcal" inputMode="numeric" placeholder="авто" />
        <TextField label="Дата" name="date" type="date" defaultValue={today} max={today} />
      </div>
      <TextField label="Заметка" name="note" maxLength={200} />
      <p className="text-xs text-muted">Если не знаете ккал — оставьте пустым, посчитаем по виду, времени и вашему весу.</p>
      <FormMessage message={state.message} />
      <SubmitButton pendingText="Записываю…">Записать</SubmitButton>
    </form>
  );
}

export function GoalsForm({ steps, workouts }: { steps: number; workouts: number }) {
  const [state, action] = useActionState<FormMessageState, FormData>(saveActivityGoals, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Шагов в день" name="steps_goal" inputMode="numeric" defaultValue={String(steps)} />
        <NumberField label="Тренировок в неделю" name="workouts_week_goal" inputMode="numeric" defaultValue={String(workouts)} />
      </div>
      <FormMessage message={state.message} />
      <SubmitButton variant="secondary" pendingText="…">
        Сохранить цели
      </SubmitButton>
    </form>
  );
}
