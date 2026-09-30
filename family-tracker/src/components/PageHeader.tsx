import Link from "next/link";
import type { ReactNode } from "react";
import type { Profile } from "@/lib/session";

export function PageHeader({
  title,
  subtitle,
  profile,
  badge,
}: {
  title: string;
  subtitle?: string;
  profile: Profile;
  badge?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-3 pt-4 pb-5">
      <div className="min-w-0">
        {subtitle && <p className="text-sm text-muted first-letter:uppercase">{subtitle}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[28px] leading-tight font-bold tracking-tight">{title}</h1>
          {badge}
        </div>
      </div>
      <Link
        href="/profile"
        aria-label="Профиль"
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card text-2xl shadow-sm active:scale-95"
      >
        {profile.avatar_emoji}
      </Link>
    </header>
  );
}
