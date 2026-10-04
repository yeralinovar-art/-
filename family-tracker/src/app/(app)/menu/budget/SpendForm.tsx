"use client";

import { useActionState } from "react";
import { FormMessage, NumberField, SubmitButton, TextField } from "@/components/ui";
import type { FormMessageState } from "@/lib/form";
import { addSpend } from "../actions";

export function SpendForm({ today }: { today: string }) {
  const [state, action] = useActionState<FormMessageState, FormData>(addSpend, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Сумма" name="amount" inputMode="numeric" suffix="₸" required />
        <TextField label="Дата" name="spent_on" type="date" defaultValue={today} max={today} />
      </div>
      <TextField label="Магазин" name="store" maxLength={60} placeholder="Magnum, Small, базар…" />
      <FormMessage message={state.message} />
      <SubmitButton pendingText="Записываю…">Записать</SubmitButton>
    </form>
  );
}
