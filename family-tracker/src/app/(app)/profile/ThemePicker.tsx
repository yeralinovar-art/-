"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { THEMES, type Theme } from "@/lib/theme";
import { setTheme } from "./actions";

/** Сразу перекрашиваем страницу, не дожидаясь сервера. */
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

export function ThemePicker({ current }: { current: Theme }) {
  const [theme, setLocal] = useState<Theme>(current);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function choose(next: Theme) {
    setLocal(next);
    applyTheme(next);
    startTransition(async () => {
      await setTheme(next);
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-3 rounded-2xl bg-card-muted p-1" role="radiogroup" aria-label="Оформление">
      {THEMES.map((t) => (
        <button
          key={t.value}
          type="button"
          role="radio"
          aria-checked={theme === t.value}
          onClick={() => choose(t.value)}
          className={`min-h-11 rounded-xl px-1 text-sm font-semibold transition ${theme === t.value ? "bg-card text-text shadow-sm" : "text-muted"}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
