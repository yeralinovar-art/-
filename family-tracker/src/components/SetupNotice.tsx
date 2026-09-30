import { Card } from "@/components/ui";

/** Показывается, пока в переменных окружения нет ключей Supabase. */
export function SetupNotice() {
  return (
    <Card className="flex flex-col gap-2 text-sm">
      <h2 className="text-base font-semibold">Подключите Supabase</h2>
      <p className="text-muted">
        Приложение ещё не знает, где хранить данные. Добавьте переменные{" "}
        <code className="rounded bg-card-muted px-1">NEXT_PUBLIC_SUPABASE_URL</code> и{" "}
        <code className="rounded bg-card-muted px-1">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> в
        файл <code className="rounded bg-card-muted px-1">.env.local</code> (или в настройки
        проекта на Vercel) и перезапустите. Подробно — в README.
      </p>
    </Card>
  );
}
