import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui";
import type { DayEvent } from "@/lib/calendar";
import { getImportedEvents } from "@/lib/calendar-data";
import { addDays } from "@/lib/health";

export function CalendarEvents({ events, empty }: { events: DayEvent[]; empty: string }) {
  if (!events.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {events.map((e, i) => (
        <li key={i} className="flex gap-3 text-sm">
          <span className="w-[4.75rem] shrink-0 whitespace-nowrap tabular-nums text-muted">{e.allDay ? "весь день" : (e.time ?? "идёт")}</span>
          <span className="min-w-0 flex-1">
            <span className="font-medium">{e.title}</span>
            {e.location && <span className="block truncate text-xs text-muted">{e.location}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Карточка «Календарь» на «Сегодня»: события Google на сегодня и завтра. Нет подключения — ничего. */
export async function CalendarCard({ today }: { today: string }) {
  const result = await getImportedEvents(today, 2);
  if (!result) return null;
  const tomorrow = addDays(today, 1);
  return (
    <Card className="flex flex-col gap-3">
      <Link href="/profile/calendar" className="flex items-center gap-2">
        <CalendarDays className="size-5 text-accent" aria-hidden />
        <h2 className="flex-1 font-semibold">Календарь</h2>
        <ChevronRight className="size-5 text-muted" aria-hidden />
      </Link>
      {"error" in result ? (
        <p className="text-sm text-muted">Календарь сейчас не открывается — попробуем позже.</p>
      ) : (
        <>
          <CalendarEvents events={result.events.filter((e) => e.date === today)} empty="Сегодня событий нет" />
          {result.events.some((e) => e.date === tomorrow) && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Завтра</p>
              <CalendarEvents events={result.events.filter((e) => e.date === tomorrow)} empty="" />
            </div>
          )}
        </>
      )}
    </Card>
  );
}
