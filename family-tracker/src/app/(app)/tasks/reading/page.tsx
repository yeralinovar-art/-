import { PageHeader } from "@/components/PageHeader";
import { ReadingCard } from "@/components/ReadingCard";
import { Card, ProgressBar } from "@/components/ui";
import { requireFamilySession } from "@/lib/session";
import { bookPercent, BOOK_STATUSES, formatMinutes, periodRange, readingByDay, readingStreak, sumBetween } from "@/lib/timetrack";
import { getBooks, getReading, getReadingGoal } from "@/lib/timetrack-data";
import { todayKey } from "@/lib/time";
import { deleteBook } from "../time-actions";
import { TasksTabs } from "../TasksTabs";
import { BookForm, BookUpdateForm, GoalForm, ManualReadingForm } from "./Forms";

export const metadata = { title: "Чтение — Семья" };

export default async function ReadingPage() {
  const today = todayKey();
  const [session, books, { sessions, running }] = await Promise.all([requireFamilySession(), getBooks(), getReading(today)]);
  const goal = await getReadingGoal(session.userId);
  // eslint-disable-next-line react-hooks/purity -- серверный рендер одного запроса
  const now = Date.now();
  const byDay = readingByDay(sessions);
  const week = periodRange("week", today);
  const month = periodRange("month", today);
  const reading = books.filter((b) => b.status === "reading");

  return (
    <>
      <PageHeader title="Дела" subtitle="Чтение — у каждого своё" profile={session.profile} />
      <TasksTabs />
      <div className="flex flex-col gap-4">
        <ReadingCard
          minutesToday={byDay.get(today) ?? 0}
          goal={goal}
          streak={readingStreak(byDay, goal, today)}
          running={running}
          books={reading}
          serverNow={now}
        />

        <Card className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-semibold">{formatMinutes(sumBetween(byDay, week.from, week.to))}</p>
            <p className="text-xs text-muted">за неделю</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{formatMinutes(sumBetween(byDay, month.from, month.to))}</p>
            <p className="text-xs text-muted">за месяц</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{books.filter((b) => b.status === "done" && (b.finished_on ?? "") >= `${today.slice(0, 4)}-01-01`).length}</p>
            <p className="text-xs text-muted">книг за год</p>
          </div>
        </Card>

        {BOOK_STATUSES.map((s) => {
          const list = books.filter((b) => b.status === s.value);
          if (!list.length) return null;
          return (
            <Card key={s.value}>
              <h2 className="mb-1 font-semibold">
                {s.label} · {list.length}
              </h2>
              <ul className="flex flex-col divide-y divide-line">
                {list.map((b) => {
                  const pct = bookPercent(b.current_page, b.total_pages);
                  return (
                    <li key={b.id}>
                      <details className="py-2.5">
                        <summary className="flex cursor-pointer list-none flex-col gap-1.5 [&::-webkit-details-marker]:hidden">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{b.title}</span>
                              {b.author && <span className="block truncate text-xs text-muted">{b.author}</span>}
                            </span>
                            {b.status === "reading" && b.total_pages && (
                              <span className="shrink-0 text-xs text-muted tabular-nums">
                                {b.current_page} / {b.total_pages} стр.
                              </span>
                            )}
                          </span>
                          {b.status === "reading" && pct !== null && <ProgressBar value={pct} max={100} />}
                        </summary>
                        <div className="mt-3 flex flex-col gap-2">
                          <BookUpdateForm book={b} />
                          <form action={deleteBook}>
                            <input type="hidden" name="id" value={b.id} />
                            <button className="min-h-9 text-sm text-danger">Удалить книгу</button>
                          </form>
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
            </Card>
          );
        })}

        <Card>
          <h2 className="mb-3 font-semibold">Добавить книгу</h2>
          <BookForm />
        </Card>

        <details className="rounded-3xl bg-card p-4 shadow-sm">
          <summary className="cursor-pointer font-semibold">Записать чтение вручную</summary>
          <div className="mt-3">
            <ManualReadingForm books={reading} today={today} />
          </div>
        </details>

        <details className="rounded-3xl bg-card p-4 shadow-sm">
          <summary className="cursor-pointer font-semibold">Цель в день: {goal} мин</summary>
          <div className="mt-3">
            <GoalForm goal={goal} />
          </div>
        </details>
      </div>
    </>
  );
}
