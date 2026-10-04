"use client";

import { useActionState, useState } from "react";
import { X } from "lucide-react";
import { FormMessage, NumberField, SubmitButton, TextField, Toggle } from "@/components/ui";
import type { FormMessageState } from "@/lib/form";
import { daysBetween } from "@/lib/health";
import { everyLabel } from "@/lib/tasks";
import { deleteChore, doneChore, saveChore } from "../actions";

type ChoreItem = {
  id: string;
  title: string;
  emoji: string;
  every: number;
  rotate: boolean;
  next_due: string;
  who: string;
  mine: boolean;
  lastBy: string | null;
  lastOn: string | null;
};

function status(nextDue: string, today: string): { text: string; tone: string } {
  const d = daysBetween(today, nextDue);
  if (d < 0) return { text: `просрочено ${-d} дн.`, tone: "text-danger" };
  if (d === 0) return { text: "сегодня", tone: "text-accent" };
  if (d === 1) return { text: "завтра", tone: "text-muted" };
  return { text: `через ${d} дн.`, tone: "text-muted" };
}

export function ChoreList({ items, today }: { items: ChoreItem[]; today: string }) {
  if (!items.length) return <p className="py-1 text-sm text-muted">Например: пылесос раз в неделю, мусор каждый день — по очереди.</p>;
  return (
    <ul className="flex flex-col divide-y divide-line">
      {items.map((c) => {
        const s = status(c.next_due, today);
        const due = daysBetween(today, c.next_due) <= 0;
        return (
          <li key={c.id} className="flex items-center gap-3 py-2.5">
            <span className="w-7 shrink-0 text-center text-xl" aria-hidden>
              {c.emoji}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{c.title}</span>
              <span className="block truncate text-xs text-muted">
                очередь: {c.who} · <span className={s.tone}>{s.text}</span> · {everyLabel(c.every)}
                {c.lastBy && c.lastOn ? ` · последний раз: ${c.lastBy}` : ""}
              </span>
            </span>
            <form action={doneChore}>
              <input type="hidden" name="id" value={c.id} />
              <SubmitButton
                variant={due && c.mine ? "primary" : "secondary"}
                className="min-h-9! w-auto! rounded-full! px-3! text-sm"
                pendingText="…"
                aria-label={`Сделано: ${c.title}`}
              >
                Сделано
              </SubmitButton>
            </form>
            <form action={deleteChore}>
              <input type="hidden" name="id" value={c.id} />
              <button aria-label={`Удалить: ${c.title}`} className="flex size-8 items-center justify-center rounded-full text-muted active:bg-card-muted">
                <X className="size-4" aria-hidden />
              </button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}

export function ChoreForm({ partnerName, today }: { partnerName: string | null; today: string }) {
  const [state, action] = useActionState<FormMessageState, FormData>(saveChore, {});
  const [assignee, setAssignee] = useState<"me" | "partner" | "both">("me");
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="assignee" value={assignee} />
      <TextField label="Дело" name="title" required maxLength={80} placeholder="Пылесос, мусор, стирка…" />
      <NumberField label="Повторять каждые" name="every_days" defaultValue="7" inputMode="numeric" suffix="дн." hint="1 — каждый день, 7 — раз в неделю" />
      <TextField label="Первый раз" name="next_due" type="date" defaultValue={today} />
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted">Кто начинает</span>
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-card p-1">
          {(
            [
              ["me", "Я"],
              ["partner", partnerName ?? "Партнёр"],
              ["both", "Оба"],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => setAssignee(v)}
              aria-pressed={assignee === v}
              className={`min-h-10 truncate rounded-xl px-2 text-sm font-medium ${assignee === v ? "bg-accent text-accent-text" : "text-muted"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <Toggle label="По очереди" description="После «Сделано» очередь переходит ко второму" name="rotate" defaultChecked />
      <FormMessage message={state.message} />
      <SubmitButton pendingText="Добавляю…">Добавить дело</SubmitButton>
    </form>
  );
}
