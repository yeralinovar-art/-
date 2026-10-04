import Link from "next/link";
import { BookOpen, Play, Square } from "lucide-react";
import { RunningClock } from "@/components/RunningClock";
import { Card, ProgressBar, SubmitButton } from "@/components/ui";
import { startReading, stopReading } from "@/app/(app)/tasks/time-actions";
import type { ReadingSession } from "@/lib/timetrack";

type BookOption = { id: string; title: string; current_page: number; total_pages: number | null };

/** Чтение сегодня: прогресс к цели, серия и таймер. */
export function ReadingCard({
  minutesToday,
  goal,
  streak,
  running,
  books,
  serverNow,
  link = false,
}: {
  minutesToday: number;
  goal: number;
  streak: number;
  running: ReadingSession | null;
  books: BookOption[];
  serverNow: number;
  link?: boolean;
}) {
  const book = running?.book_id ? books.find((b) => b.id === running.book_id) : null;
  const done = minutesToday >= goal;
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <BookOpen className="size-5 text-accent" aria-hidden />
          Чтение
        </h2>
        {link ? (
          <Link href="/tasks/reading" className="text-sm font-medium text-accent">
            {minutesToday} из {goal} мин →
          </Link>
        ) : (
          <span className="text-sm text-muted">
            {minutesToday} из {goal} мин
          </span>
        )}
      </div>
      <ProgressBar value={minutesToday} max={goal} />
      <p className="text-xs text-muted">
        {done ? "Цель на сегодня выполнена ✓" : `Осталось ${goal - minutesToday} мин`}
        {streak > 0 ? ` · серия ${streak} дн.` : ""}
      </p>

      {running?.started_at ? (
        <form action={stopReading} className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted">{book ? book.title : "Читаю"}</p>
            <RunningClock startedAt={running.started_at} serverNow={serverNow} className="text-2xl font-semibold" />
          </div>
          {book && (
            <label className="flex w-24 flex-col gap-1">
              <span className="text-xs text-muted">Стр.</span>
              <input
                name="page"
                inputMode="numeric"
                defaultValue={book.current_page || ""}
                aria-label="На какой странице остановились"
                className="h-11 rounded-xl border border-line bg-card px-3 text-right outline-none focus:border-accent"
              />
            </label>
          )}
          <SubmitButton className="w-auto! rounded-full! px-5!" pendingText="…" aria-label="Остановить чтение">
            <span className="inline-flex items-center gap-1.5">
              <Square className="size-4" fill="currentColor" aria-hidden />
              Стоп
            </span>
          </SubmitButton>
        </form>
      ) : (
        <form action={startReading} className="flex gap-2">
          {books.length > 0 && (
            <select
              name="book_id"
              aria-label="Книга"
              defaultValue={books[0].id}
              className="min-h-11 min-w-0 flex-1 rounded-2xl border border-line bg-card px-3 outline-none focus:border-accent"
            >
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
              <option value="">Без книги</option>
            </select>
          )}
          <SubmitButton className={books.length ? "w-auto! px-5!" : ""} pendingText="…">
            <span className="inline-flex items-center gap-1.5">
              <Play className="size-4" fill="currentColor" aria-hidden />
              Читать
            </span>
          </SubmitButton>
        </form>
      )}
    </Card>
  );
}
