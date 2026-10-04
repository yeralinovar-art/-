import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
      <SearchX className="size-12 text-muted" aria-hidden />
      <h1 className="text-xl font-semibold">Страница не найдена</h1>
      <p className="text-muted">Возможно, запись удалили или она доступна только другому члену семьи.</p>
      <Link href="/" className="rounded-2xl bg-accent px-6 py-3 font-semibold text-accent-text active:opacity-80">
        На главную
      </Link>
    </main>
  );
}
