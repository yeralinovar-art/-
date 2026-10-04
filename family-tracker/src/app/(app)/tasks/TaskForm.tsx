"use client";

import { useActionState, useState } from "react";
import { FormMessage, SubmitButton, TextField } from "@/components/ui";
import type { FormMessageState } from "@/lib/form";
import { PRIORITIES, type Task } from "@/lib/tasks";
import { saveTask } from "./actions";

const textareaCls = "min-h-20 rounded-2xl border border-line bg-card px-4 py-3 outline-none transition focus:border-accent";

function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-muted">{label}</span>
      <div className="grid gap-1 rounded-2xl bg-card-muted p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={value === o.value}
            className={`min-h-10 truncate rounded-xl px-2 text-sm font-medium transition ${value === o.value ? "bg-card shadow-sm" : "text-muted"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TaskForm({
  task,
  me,
  partnerName,
  back,
  planId,
  defaultShared = false,
}: {
  task?: Task | null;
  me: string;
  partnerName: string | null;
  back: string;
  planId?: string | null;
  defaultShared?: boolean;
}) {
  const [state, action] = useActionState<FormMessageState, FormData>(saveTask, {});
  const inPlan = Boolean(planId ?? task?.plan_id);
  const [kind, setKind] = useState<"personal" | "shared">(task ? (task.shared ? "shared" : "personal") : defaultShared || inPlan ? "shared" : "personal");
  const [assignee, setAssignee] = useState<"me" | "partner" | "both">(
    !task?.assignee_id ? "both" : task.assignee_id === me ? "me" : "partner",
  );
  const [priority, setPriority] = useState<number>(task?.priority ?? 2);
  // Чужая личная задача сюда не попадает (RLS), а общую нельзя сделать личной за партнёра.
  const canMakePersonal = !task || task.owner_id === me;

  return (
    <form action={action} className="flex flex-col gap-4">
      {task && <input type="hidden" name="id" value={task.id} />}
      <input type="hidden" name="back" value={back} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="assignee" value={assignee} />
      <input type="hidden" name="priority" value={priority} />
      {(planId ?? task?.plan_id) && <input type="hidden" name="plan_id" value={planId ?? task?.plan_id ?? ""} />}

      <TextField label="Что сделать" name="title" defaultValue={task?.title} required maxLength={200} autoFocus={!task} placeholder="Например: записаться к педиатру" />

      {!inPlan && canMakePersonal && (
        <Segmented
          label="Чья задача"
          value={kind}
          onChange={setKind}
          options={[
            { value: "personal", label: "Личная" },
            { value: "shared", label: "Общая" },
          ]}
        />
      )}
      {kind === "shared" && (
        <Segmented
          label="Кто делает"
          value={assignee}
          onChange={setAssignee}
          options={[
            { value: "me", label: "Я" },
            { value: "partner", label: partnerName ?? "Партнёр" },
            { value: "both", label: "Оба" },
          ]}
        />
      )}
      {kind === "shared" && !partnerName && <p className="text-xs text-muted">Партнёр ещё не присоединился — задачу увидит, когда войдёт в семью.</p>}

      <TextField label="Срок" name="due_date" type="date" defaultValue={task?.due_date ?? ""} />

      <Segmented label="Приоритет" value={priority} onChange={setPriority} options={PRIORITIES.map((p) => ({ value: p.value as number, label: p.label }))} />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted">Комментарий</span>
        <textarea name="note" defaultValue={task?.note ?? ""} maxLength={2000} className={textareaCls} />
      </label>

      <FormMessage message={state.message} />
      <SubmitButton pendingText="Сохраняю…">{task ? "Сохранить" : "Добавить задачу"}</SubmitButton>
    </form>
  );
}
