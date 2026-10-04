"use client";

import { useOptimistic, useTransition } from "react";
import { Check } from "lucide-react";
import { toggleHabit } from "@/app/(app)/tasks/actions";

export type HabitItem = {
  id: string;
  title: string;
  emoji: string;
  checked: boolean;
  /** «4 дня подряд», «2 из 3 на неделе». */
  hint: string;
};

export function HabitList({ items, date }: { items: HabitItem[]; date: string }) {
  return (
    <ul className="flex flex-col divide-y divide-line">
      {items.map((h) => (
        <HabitRow key={h.id} item={h} date={date} />
      ))}
    </ul>
  );
}

function HabitRow({ item, date }: { item: HabitItem; date: string }) {
  const [, startTransition] = useTransition();
  const [checked, setChecked] = useOptimistic(item.checked);
  function toggle() {
    const fd = new FormData();
    fd.set("habit_id", item.id);
    fd.set("date", date);
    fd.set("checked", checked ? "1" : "0");
    startTransition(async () => {
      setChecked(!checked);
      await toggleHabit(fd);
    });
  }
  return (
    <li>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={checked}
        aria-label={`${item.title}: ${checked ? "снять отметку" : "отметить"}`}
        className="flex w-full items-center gap-3 py-2.5 text-left"
      >
        <span className="w-7 shrink-0 text-center text-xl" aria-hidden>
          {item.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{item.title}</span>
          {item.hint && <span className="block truncate text-xs text-muted">{item.hint}</span>}
        </span>
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition ${
            checked ? "border-accent bg-accent text-accent-text" : "border-line"
          }`}
        >
          {checked && <Check className="size-5" strokeWidth={3} aria-hidden />}
        </span>
      </button>
    </li>
  );
}
