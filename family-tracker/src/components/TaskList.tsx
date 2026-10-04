"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { Check, Users } from "lucide-react";
import { toggleTask } from "@/app/(app)/tasks/actions";

export type TaskItem = {
  id: string;
  title: string;
  done: boolean;
  shared: boolean;
  priority: 1 | 2 | 3;
  due: { text: string; tone: "danger" | "accent" | "muted" } | null;
  who: string | null;
  doneBy: string | null;
};

const TONE = { danger: "text-danger", accent: "text-accent", muted: "text-muted" };

/** Список задач с галочкой «сделано». Нажатие на название — открыть задачу. */
export function TaskList({ items, back }: { items: TaskItem[]; back?: string }) {
  return (
    <ul className="flex flex-col divide-y divide-line">
      {items.map((t) => (
        <TaskRow key={t.id} item={t} back={back} />
      ))}
    </ul>
  );
}

function TaskRow({ item, back }: { item: TaskItem; back?: string }) {
  const [, startTransition] = useTransition();
  const [done, setDone] = useOptimistic(item.done);

  function toggle() {
    const fd = new FormData();
    fd.set("id", item.id);
    fd.set("done", done ? "0" : "1");
    startTransition(async () => {
      setDone(!done);
      await toggleTask(fd);
    });
  }

  const meta = [
    item.due && !done ? <span key="due" className={TONE[item.due.tone]}>{item.due.text}</span> : null,
    item.who ? <span key="who">{item.who === "оба" ? "оба" : `→ ${item.who}`}</span> : null,
    done && item.doneBy ? <span key="by">сделал(а) {item.doneBy}</span> : null,
  ].filter(Boolean);

  return (
    <li className="flex items-center gap-3 py-2.5">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={done}
        aria-label={`${item.title}: ${done ? "вернуть в работу" : "сделано"}`}
        className={`flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition ${
          done ? "border-accent bg-accent text-accent-text" : item.priority === 1 ? "border-danger" : "border-line"
        }`}
      >
        {done && <Check className="size-5" strokeWidth={3} aria-hidden />}
      </button>
      <Link href={`/tasks/${item.id}${back ? `?back=${encodeURIComponent(back)}` : ""}`} className="min-w-0 flex-1">
        <span className={`flex items-center gap-1.5 font-medium ${done ? "text-muted line-through" : ""}`}>
          <span className="truncate">{item.title}</span>
          {item.shared && <Users className="size-3.5 shrink-0 text-family" aria-label="общая" />}
        </span>
        {meta.length > 0 && (
          <span className="flex gap-2 truncate text-xs text-muted">
            {meta.map((m, i) => (
              <span key={i} className="flex gap-2">
                {i > 0 && <span aria-hidden>·</span>}
                {m}
              </span>
            ))}
          </span>
        )}
      </Link>
    </li>
  );
}
