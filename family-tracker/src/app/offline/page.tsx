import { WifiOff } from "lucide-react";

export const metadata = { title: "Нет сети — Семья" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
      <WifiOff className="size-12 text-muted" aria-hidden />
      <h1 className="text-xl font-semibold">Нет подключения к интернету</h1>
      <p className="text-muted">Проверьте сеть и попробуйте ещё раз.</p>
      {/* Полная перезагрузка страницы, а не переход внутри приложения. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        href="/"
        className="rounded-2xl bg-accent px-6 py-3 font-semibold text-accent-text active:opacity-80"
      >
        Обновить
      </a>
    </main>
  );
}
