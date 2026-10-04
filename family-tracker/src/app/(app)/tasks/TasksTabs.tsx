"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/tasks", label: "Задачи" },
  { href: "/tasks/habits", label: "Привычки" },
  { href: "/tasks/time", label: "Время" },
  { href: "/tasks/reading", label: "Чтение" },
  { href: "/tasks/family", label: "Семья" },
  { href: "/tasks/health", label: "Здоровье" },
];

export function TasksTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Разделы дел" className="-mx-4 mb-4 overflow-x-auto px-4">
      <div className="flex w-max gap-1 rounded-2xl bg-card-muted p-1">
        {TABS.map((t) => {
          const active =
            t.href === "/tasks"
              ? pathname === "/tasks"
              : t.href === "/tasks/family"
                ? pathname.startsWith("/tasks/family") || pathname.startsWith("/tasks/plans")
                : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-10 items-center justify-center rounded-xl px-3.5 text-sm font-medium transition ${active ? "bg-card shadow-sm" : "text-muted"}`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
