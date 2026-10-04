import Link from "next/link";
import { X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ProjectBars } from "@/components/ProjectBars";
import { TimerCard } from "@/components/TimerCard";
import { Card } from "@/components/ui";
import { requireFamilySession } from "@/lib/session";
import { addDays } from "@/lib/health";
import { dayLabel } from "@/lib/menu";
import { entryMinutes, formatMinutes, localDate, periodRange, totalsByProject, type Period } from "@/lib/timetrack";
import { getProjects, getTimeEntries } from "@/lib/timetrack-data";
import { todayKey } from "@/lib/time";
import { archiveProject, deleteTimeEntry } from "../time-actions";
import { TasksTabs } from "../TasksTabs";
import { ManualTimeForm, ProjectForm } from "./Forms";

export const metadata = { title: "Время — Семья" };

export default async function TimePage({ searchParams }: PageProps<"/tasks/time">) {
  const params = await searchParams;
  const period: Period = params.period === "month" ? "month" : "week";
  const today = todayKey();
  const range = periodRange(period, today);
  const since = range.from < addDays(today, -14) ? range.from : addDays(today, -14);
  const [session, projects, allProjects, entries] = await Promise.all([
    requireFamilySession(),
    getProjects(),
    getProjects(true),
    getTimeEntries(since),
  ]);
  // Время запроса — для таймера и итогов (страница динамическая).
  // eslint-disable-next-line react-hooks/purity -- серверный рендер одного запроса
  const now = Date.now();
  const running = entries.find((e) => !e.ended_at) ?? null;
  const byId = new Map(allProjects.map((p) => [p.id, p]));
  const totals = totalsByProject(entries, range.from, range.to, now).map((t) => ({
    id: t.project_id,
    name: byId.get(t.project_id)?.name ?? "—",
    slot: byId.get(t.project_id)?.color_slot ?? 1,
    minutes: t.minutes,
    kind: byId.get(t.project_id)?.kind ?? "work",
  }));
  const sum = (kind?: string) => totals.filter((t) => !kind || t.kind === kind).reduce((s, t) => s + t.minutes, 0);
  const recent = entries.filter((e) => e.ended_at).slice(0, 12);

  return (
    <>
      <PageHeader title="Дела" subtitle="Работа и хобби — время только ваше" profile={session.profile} />
      <TasksTabs />
      <div className="flex flex-col gap-4">
        <TimerCard projects={projects} running={running} serverNow={now} />

        <Card>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-semibold">{period === "week" ? "Эта неделя" : "Этот месяц"}</h2>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-card-muted p-1 text-sm">
              {(
                [
                  ["week", "Неделя"],
                  ["month", "Месяц"],
                ] as const
              ).map(([v, l]) => (
                <Link
                  key={v}
                  href={v === "week" ? "/tasks/time" : "/tasks/time?period=month"}
                  aria-current={period === v ? "page" : undefined}
                  className={`rounded-lg px-3 py-1.5 text-center font-medium ${period === v ? "bg-card shadow-sm" : "text-muted"}`}
                >
                  {l}
                </Link>
              ))}
            </div>
          </div>
          {totals.length ? (
            <>
              <p className="mb-3 text-sm text-muted">
                Всего {formatMinutes(sum())} · работа {formatMinutes(sum("work"))} · хобби {formatMinutes(sum("hobby"))}
              </p>
              <ProjectBars items={totals} />
            </>
          ) : (
            <p className="text-sm text-muted">Пока нет записей за этот период. Запустите таймер или добавьте время вручную.</p>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Добавить время вручную</h2>
          {projects.length ? <ManualTimeForm projects={projects} today={today} /> : <p className="text-sm text-muted">Сначала добавьте проект ниже.</p>}
        </Card>

        {recent.length > 0 && (
          <Card>
            <h2 className="mb-1 font-semibold">Последние записи</h2>
            <ul className="flex flex-col divide-y divide-line">
              {recent.map((e) => {
                const p = byId.get(e.project_id);
                const d = dayLabel(localDate(e.started_at));
                return (
                  <li key={e.id} className="flex items-center gap-3 py-2">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: `var(--series-${p?.color_slot ?? 1})` }} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p?.name ?? "—"}</span>
                      <span className="block truncate text-xs text-muted">
                        {d.short}, {d.long}
                        {e.note ? ` · ${e.note}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm tabular-nums">{formatMinutes(entryMinutes(e, now))}</span>
                    <form action={deleteTimeEntry}>
                      <input type="hidden" name="id" value={e.id} />
                      <button aria-label={`Удалить запись: ${p?.name ?? ""}`} className="flex size-8 items-center justify-center rounded-full text-muted active:bg-card-muted">
                        <X className="size-4" aria-hidden />
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        <Card className="flex flex-col gap-3">
          <h2 className="font-semibold">Проекты</h2>
          {projects.length > 0 && (
            <ul className="flex flex-col divide-y divide-line">
              {projects.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2">
                  <span className="size-3 shrink-0 rounded-full" style={{ background: `var(--series-${p.color_slot})` }} aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  <span className="shrink-0 text-xs text-muted">{p.kind === "work" ? "работа" : "хобби"}</span>
                  <form action={archiveProject}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="min-h-9 px-2 text-sm text-muted" aria-label={`В архив: ${p.name}`}>
                      В архив
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <ProjectForm />
        </Card>
      </div>
    </>
  );
}
