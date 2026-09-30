"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, ChartLine, House, Salad, UtensilsCrossed, type LucideIcon } from "lucide-react";

type Tab = { href: string; label: string; icon: LucideIcon; shared?: boolean };

export const TABS: Tab[] = [
  { href: "/", label: "Сегодня", icon: House },
  { href: "/food", label: "Питание", icon: Salad },
  { href: "/menu", label: "Меню", icon: UtensilsCrossed, shared: true },
  { href: "/tasks", label: "Дела", icon: CalendarCheck },
  { href: "/progress", label: "Прогресс", icon: ChartLine },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Разделы"
      className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-[var(--nav-bg)] backdrop-blur-xl"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {TABS.map(({ href, label, icon: Icon, shared }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                <Icon className="size-6" strokeWidth={active ? 2.4 : 1.8} aria-hidden />
                {label}
                {shared && (
                  <span
                    className="absolute top-2 right-[calc(50%-18px)] size-2 rounded-full bg-family"
                    aria-label="общий раздел"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
