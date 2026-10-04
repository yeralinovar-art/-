"use client";

import { useActionState, useState } from "react";
import { FormMessage, NumberField, SubmitButton, TextField } from "@/components/ui";
import type { FormMessageState } from "@/lib/form";
import { saveGoal, saveHabit, updateGoalProgress } from "../actions";

const EMOJI = ["✅", "💧", "🚶‍♀️", "📖", "🧘", "🥗", "😴", "🙏", "💊", "📵"];

export function HabitForm() {
  const [state, action] = useActionState<FormMessageState, FormData>(saveHabit, {});
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [emoji, setEmoji] = useState("✅");
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="frequency" value={frequency} />
      <input type="hidden" name="emoji" value={emoji} />
      <TextField label="Привычка" name="title" required maxLength={80} placeholder="Например: 10 минут прогулки" />
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Значок">
        {EMOJI.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setEmoji(e)}
            aria-pressed={emoji === e}
            aria-label={`Значок ${e}`}
            className={`flex size-10 items-center justify-center rounded-xl text-xl ${emoji === e ? "bg-card ring-2 ring-accent" : "bg-card"}`}
          >
            {e}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-card p-1">
        {(
          [
            ["daily", "Каждый день"],
            ["weekly", "N раз в неделю"],
          ] as const
        ).map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => setFrequency(v)}
            aria-pressed={frequency === v}
            className={`min-h-10 rounded-xl text-sm font-medium ${frequency === v ? "bg-accent text-accent-text" : "text-muted"}`}
          >
            {l}
          </button>
        ))}
      </div>
      {frequency === "weekly" && <NumberField label="Сколько раз в неделю" name="target_per_week" defaultValue="3" inputMode="numeric" />}
      <FormMessage message={state.message} />
      <SubmitButton pendingText="Добавляю…">Добавить привычку</SubmitButton>
    </form>
  );
}

export function GoalForm() {
  const [state, action] = useActionState<FormMessageState, FormData>(saveGoal, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <TextField label="Цель" name="title" required maxLength={100} placeholder="Например: прочитать 12 книг" />
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Сколько всего" name="target" hint="можно оставить пустым" />
        <TextField label="Единица" name="unit" maxLength={20} placeholder="книг, ₸, км" />
      </div>
      <TextField label="Срок" name="deadline" type="date" />
      <FormMessage message={state.message} />
      <SubmitButton pendingText="Добавляю…">Добавить цель</SubmitButton>
    </form>
  );
}

export function GoalProgressForm({ id, current, unit }: { id: string; current: number; unit: string | null }) {
  const [state, action] = useActionState<FormMessageState, FormData>(updateGoalProgress, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <NumberField label="Сейчас" name="current" defaultValue={String(current).replace(".", ",")} suffix={unit ?? undefined} />
        </div>
        <SubmitButton className="w-auto!" pendingText="…">
          Обновить
        </SubmitButton>
      </div>
      <FormMessage message={state.message} />
    </form>
  );
}
