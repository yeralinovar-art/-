"use client";

import { useActionState, useState } from "react";
import { FormMessage, NumberField, SubmitButton, TextField } from "@/components/ui";
import type { FormMessageState } from "@/lib/form";
import { saveWeight } from "./actions";

export function WeightForm({ today, lastKg }: { today: string; lastKg: number | null }) {
  const [state, action] = useActionState<FormMessageState, FormData>(saveWeight, {});
  const [more, setMore] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <NumberField
          label="Вес"
          name="weight_kg"
          suffix="кг"
          placeholder={lastKg ? String(lastKg).replace(".", ",") : "65,0"}
          autoFocus
          required
        />
        <TextField label="Дата" name="entry_date" type="date" defaultValue={today} max={today} />
      </div>
      {more ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            <NumberField label="Талия" name="waist_cm" suffix="см" />
            <NumberField label="Бёдра" name="hips_cm" suffix="см" />
            <NumberField label="Грудь" name="chest_cm" suffix="см" />
          </div>
          <TextField label="Заметка" name="note" maxLength={300} placeholder="Например: после выходных" />
        </>
      ) : (
        <button type="button" onClick={() => setMore(true)} className="self-start text-sm font-medium text-accent">
          + Замеры и заметка
        </button>
      )}
      <FormMessage message={state.message} />
      <SubmitButton>Записать</SubmitButton>
    </form>
  );
}
