"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Apple, Droplet, Pill, Plus, Scale, X } from "lucide-react";
import { addWater } from "@/app/(app)/food/actions";

// Быстрый ввод с любого экрана — только то, что уже работает.
export function QuickAdd() {
  const [open, setOpen] = useState(false);
  const [waterAdded, setWaterAdded] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => {
    setOpen(false);
    setWaterAdded(false);
  };

  const tile =
    "flex w-full flex-col items-center gap-1.5 rounded-2xl bg-card-muted px-2 py-4 transition active:scale-95";

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
          <button type="button" aria-label="Закрыть" className="absolute inset-0 bg-black/40" onClick={close} />
          <div className="pb-safe relative mx-auto w-full max-w-md rounded-t-3xl bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Добавить</h2>
              <button type="button" onClick={close} aria-label="Закрыть" className="flex size-10 items-center justify-center rounded-full bg-card-muted">
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <ul className="grid grid-cols-2 gap-3 pb-4">
              <li>
                <Link href="/food/add" onClick={close} className={tile}>
                  <Apple className="size-7 text-accent" aria-hidden />
                  <span className="text-sm font-medium">Еда</span>
                </Link>
              </li>
              <li>
                <Link href="/weight" onClick={close} className={tile}>
                  <Scale className="size-7 text-accent" aria-hidden />
                  <span className="text-sm font-medium">Вес</span>
                </Link>
              </li>
              <li>
                <Link href="/meds" onClick={close} className={tile}>
                  <Pill className="size-7 text-accent" aria-hidden />
                  <span className="text-sm font-medium">Витамины</span>
                </Link>
              </li>
              <li>
                <form
                  action={async (fd) => {
                    await addWater(fd);
                    setWaterAdded(true);
                  }}
                >
                  <input type="hidden" name="delta" value="250" />
                  <button type="submit" className={tile}>
                    <Droplet className="size-7 text-sky-500" aria-hidden />
                    <span className="text-sm font-medium">{waterAdded ? "Ещё стакан" : "Стакан воды"}</span>
                  </button>
                </form>
              </li>
            </ul>
            {waterAdded && <p className="pb-2 text-center text-sm text-accent">+250 мл записано</p>}
          </div>
        </div>
      )}
    </>
  );
}
