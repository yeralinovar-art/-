"use client";

import { useActionState, useState } from "react";
import { FormMessage, SubmitButton, TextField } from "@/components/ui";
import type { FormMessageState } from "@/lib/form";
import type { Plan } from "@/lib/tasks-data";
import { savePlan } from "../actions";

const EMOJI = ["🎯", "✈️", "🏠", "🛠️", "👶", "🚗", "💰", "🎁", "🏖️", "📦"];

export function PlanForm({ plan }: { plan?: Plan }) {
  const [state, action] = useActionState<FormMessageState, FormData>(savePlan, {});
  const [emoji, setEmoji] = useState(plan?.emoji ?? "🎯");
  return (
    <form action={action} className="flex flex-col gap-3">
      {plan && <input type="hidden" name="id" value={plan.id} />}
      <input type="hidden" name="emoji" value={emoji} />
      <TextField label="План" name="title" defaultValue={plan?.title} required maxLength={100} placeholder="Например: подготовка к роддому" />
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Значок">
        {EMOJI.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setEmoji(e)}
            aria-pressed={emoji === e}
            aria-label={`Значок ${e}`}
            className={`flex size-10 items-center justify-center rounded-xl bg-card text-xl ${emoji === e ? "ring-2 ring-accent" : ""}`}
          >
            {e}
          </button>
        ))}
      </div>
      <TextField label="К какой дате" name="target_date" type="date" defaultValue={plan?.target_date ?? ""} />
      <TextField label="Заметка" name="note" defaultValue={plan?.note ?? ""} maxLength={1000} />
      <FormMessage message={state.message} />
      <SubmitButton pendingText="Сохраняю…">{plan ? "Сохранить" : "Создать план"}</SubmitButton>
    </form>
  );
}
