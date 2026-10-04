"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/menu", label: "Неделя" },
  { href: "/menu/recipes", label: "Рецепты" },
  { href: "/menu/shopping", label: "Покупки" },
  { href: "/menu/budget", label: "Бюджет" },
];

export function MenuTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Меню семьи" className="mb-4 grid grid-cols-4 gap-1 rounded-2xl bg-card-muted p-1">
      {TABS.map((t) => {
        const active = t.href === "/menu" ? pathname === "/menu" || pathname === "/menu/add" : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-10 items-center justify-center rounded-xl text-sm font-medium transition ${active ? "bg-card shadow-sm" : "text-muted"}`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
