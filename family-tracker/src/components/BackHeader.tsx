import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/** Шапка вложенного экрана: «назад» и заголовок. */
export function BackHeader({ href, title }: { href: string; title: string }) {
  return (
    <header className="flex items-center gap-2 pt-4 pb-4">
      <Link href={href} aria-label="Назад" className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full active:bg-card-muted">
        <ChevronLeft className="size-6" aria-hidden />
      </Link>
      <h1 className="truncate text-2xl font-bold">{title}</h1>
    </header>
  );
}
