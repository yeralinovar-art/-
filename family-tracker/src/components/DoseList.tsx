"use client";

import { useOptimistic, useTransition } from "react";
import { Check } from "lucide-react";
import { toggleDose } from "@/app/(app)/meds/actions";

export type DoseItem = {
  key: string;
  medicationId: string;
  slot: string;
  name: string;
  dose: string | null;
  note: string | null;
  who: string | null;
  takenLabel: string | null;
};

/** Приёмы на день: нажатие — отметить «принято» или снять отметку. */
export function DoseList({ items, date }: { items: DoseItem[]; date: string }) {
  return (
    <ul className="flex flex-col divide-y divide-line">
      {items.map((item) => (
        <DoseRow key={item.key} item={item} date={date} />
      ))}
    </ul>
  );
}

function DoseRow({ item, date }: { item: DoseItem; date: string }) {
  const [, startTransition] = useTransition();
  const [taken, setTaken] = useOptimistic(Boolean(item.takenLabel));

  function toggle() {
    const fd = new FormData();
    fd.set("medication_id", item.medicationId);
    fd.set("date", date);
    fd.set("slot", item.slot);
    fd.set("taken", taken ? "1" : "0");
    startTransition(async () => {
      setTaken(!taken);
      await toggleDose(fd);
    });
  }

  return (
    <li>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={taken}
        aria-label={`${item.name}${item.who ? `, ${item.who}` : ""}, ${item.slot}: ${taken ? "снять отметку" : "отметить приём"}`}
        className="flex w-full items-center gap-3 py-3 text-left"
      >
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition ${
            taken ? "border-accent bg-accent text-accent-text" : "border-line"
          }`}
        >
          {taken && <Check className="size-5" strokeWidth={3} aria-hidden />}
        </span>
        <span className="w-12 shrink-0 text-sm font-semibold tabular-nums text-muted">{item.slot}</span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate font-medium ${taken ? "text-muted line-through" : ""}`}>
            {item.name}
            {item.dose ? <span className="font-normal text-muted"> · {item.dose}</span> : null}
          </span>
          <span className="block truncate text-xs text-muted">
            {[item.who, taken ? (item.takenLabel ?? "принято") : item.note].filter(Boolean).join(" · ")}
          </span>
        </span>
      </button>
    </li>
  );
}
