"use client";

import { useEffect, useState } from "react";
import { Apple, Dumbbell, ListPlus, Plus, Scale, Timer, X, type LucideIcon } from "lucide-react";

type Action = { label: string; icon: LucideIcon; stage: number };

// Быстрый ввод с любого экрана. Пункты оживают на своих этапах разработки.
const ACTIONS: Action[] = [
  { label: "Еда", icon: Apple, stage: 2 },
  { label: "Вес", icon: Scale, stage: 2 },
  { label: "Задача", icon: ListPlus, stage: 4 },
  { label: "Тренировка", icon: Dumbbell, stage: 4 },
  { label: "Таймер", icon: Timer, stage: 4 },
];

export function QuickAdd() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Быстро добавить"
        className="fixed right-4 z-30 flex size-14 items-center justify-center rounded-full bg-accent text-accent-text shadow-lg transition active:scale-95"
        style={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom))" }}
      >
        <Plus className="size-7" strokeWidth={2.4} aria-hidden />
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-end" role="dialog" aria-modal="true" aria-label="Быстро добавить">
          <button
            type="button"
            aria-label="Закрыть"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="pb-safe relative mx-auto w-full max-w-md rounded-t-3xl bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Добавить</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Закрыть"
                className="flex size-10 items-center justify-center rounded-full bg-card-muted"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <ul className="grid grid-cols-3 gap-3 pb-4">
              {ACTIONS.map(({ label, icon: Icon, stage }) => (
                <li key={label}>
                  <button
                    type="button"
                    disabled
                    className="flex w-full flex-col items-center gap-1.5 rounded-2xl bg-card-muted px-2 py-4 disabled:opacity-60"
                  >
                    <Icon className="size-7 text-accent" aria-hidden />
                    <span className="text-sm font-medium">{label}</span>
                    <span className="text-[10px] text-muted">этап {stage}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
