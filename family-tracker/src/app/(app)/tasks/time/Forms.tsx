"use client";

import { useActionState, useState } from "react";
import { FormMessage, NumberField, SelectField, SubmitButton, TextField } from "@/components/ui";
import type { FormMessageState } from "@/lib/form";
import { PROJECT_KINDS, type Project } from "@/lib/timetrack";
import { addTimeManual, saveProject } from "../time-actions";

export function ProjectForm() {
  const [state, action] = useActionState<FormMessageState, FormData>(saveProject, {});
  const [kind, setKind] = useState<string>("work");
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="kind" value={kind} />
      <TextField label="Новый проект" name="name" required maxLength={60} placeholder="Например: клиенты, вязание, курс английского" />
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-card-muted p-1">
        {PROJECT_KINDS.map((k) => (
          <button
            key={k.value}
            type="button"
            onClick={() => setKind(k.value)}
            aria-pressed={kind === k.value}
            className={`min-h-10 rounded-xl text-sm font-medium ${kind === k.value ? "bg-card shadow-sm" : "text-muted"}`}
          >
            {k.label}
          </button>
        ))}
      </div>
      <FormMessage message={state.message} />
      <SubmitButton variant="secondary" pendingText="Добавляю…">
        Добавить проект
      </SubmitButton>
    </form>
  );
}

export function ManualTimeForm({ projects, today }: { projects: Project[]; today: string }) {
  const [state, action] = useActionState<FormMessageState, FormData>(addTimeManual, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <SelectField label="Проект" name="project_id" options={projects.map((p) => ({ value: p.id, label: p.name }))} />
      <div className="grid grid-cols-3 gap-3">
        <NumberField label="Часы" name="hours" inputMode="numeric" placeholder="0" />
        <NumberField label="Минуты" name="minutes" inputMode="numeric" placeholder="30" />
        <TextField label="Дата" name="date" type="date" defaultValue={today} max={today} />
      </div>
      <TextField label="Что делали" name="note" maxLength={200} />
      <FormMessage message={state.message} />
      <SubmitButton pendingText="Записываю…">Записать время</SubmitButton>
    </form>
  );
}
