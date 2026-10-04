"use client";

import { useActionState } from "react";
import { FormMessage, NumberField, SubmitButton, TextField } from "@/components/ui";
import { VACCINE_SUGGESTIONS } from "@/lib/family-health";
import type { FormMessageState } from "@/lib/form";
import { saveGrowth, saveVaccine } from "../actions";

export function GrowthForm({ childId, today }: { childId: string; today: string }) {
  const [state, action] = useActionState<FormMessageState, FormData>(saveGrowth, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="child_id" value={childId} />
      <div className="grid grid-cols-3 gap-3">
        <NumberField label="Рост" name="height_cm" suffix="см" />
        <NumberField label="Вес" name="weight_kg" suffix="кг" />
        <TextField label="Дата" name="measured_on" type="date" defaultValue={today} max={today} />
      </div>
      <FormMessage message={state.message} />
      <SubmitButton variant="secondary">Записать замер</SubmitButton>
    </form>
  );
}

export function VaccineForm({ childId }: { childId: string }) {
  const [state, action] = useActionState<FormMessageState, FormData>(saveVaccine, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="child_id" value={childId} />
      <TextField label="Прививка" name="name" list="vaccine-suggestions" placeholder="Например: ККП" required maxLength={80} />
      <datalist id="vaccine-suggestions">
        {VACCINE_SUGGESTIONS.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Запланирована на" name="planned_on" type="date" />
        <TextField label="Сделана" name="given_on" type="date" />
      </div>
      <TextField label="Заметка" name="note" placeholder="Реакция, где делали" maxLength={200} />
      <FormMessage message={state.message} />
      <SubmitButton variant="secondary">Добавить прививку</SubmitButton>
    </form>
  );
}
