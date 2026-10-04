import Link from "next/link";
import { Play, Square, Timer } from "lucide-react";
import { RunningClock } from "@/components/RunningClock";
import { Card, SubmitButton } from "@/components/ui";
import { startTimer, stopTimer } from "@/app/(app)/tasks/time-actions";
import type { Project, TimeEntry } from "@/lib/timetrack";

/** Таймер работы и хобби: идущий — со «Стоп», иначе кнопки старта по проектам. */
export function TimerCard({
  projects,
  running,
  serverNow,
  compact = false,
}: {
  projects: Project[];
  running: TimeEntry | null;
  serverNow: number;
  compact?: boolean;
}) {
  const project = running ? projects.find((p) => p.id === running.project_id) : null;
  if (running) {
    return (
      <Card className="flex items-center gap-3">
        <span className="size-3 shrink-0 rounded-full" style={{ background: `var(--series-${project?.color_slot ?? 1})` }} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-muted">Таймер · {project?.name ?? "проект"}</p>
          <RunningClock startedAt={running.started_at} serverNow={serverNow} className="text-2xl font-semibold" />
        </div>
        <form action={stopTimer}>
          <SubmitButton className="w-auto! gap-1.5 rounded-full! px-5!" pendingText="…" aria-label="Остановить таймер">
            <span className="inline-flex items-center gap-1.5">
              <Square className="size-4" fill="currentColor" aria-hidden />
              Стоп
            </span>
          </SubmitButton>
        </form>
      </Card>
    );
  }
  if (compact && projects.length === 0) return null;
  return (
    <Card>
      <h2 className="mb-2 flex items-center gap-2 font-semibold">
        <Timer className="size-5 text-accent" aria-hidden />
        Таймер
      </h2>
      {projects.length ? (
        <div className="flex flex-wrap gap-2">
          {projects.map((p) => (
            <form key={p.id} action={startTimer}>
              <input type="hidden" name="project_id" value={p.id} />
              <button
                aria-label={`Старт: ${p.name}`}
                className="flex min-h-10 items-center gap-2 rounded-full bg-card-muted px-4 text-sm font-medium active:scale-95"
              >
                <Play className="size-3.5" fill="currentColor" style={{ color: `var(--series-${p.color_slot})` }} aria-hidden />
                {p.name}
              </button>
            </form>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">
          Сначала добавьте проект —{" "}
          <Link href="/tasks/time" className="font-medium text-accent">
            работа или хобби
          </Link>
          .
        </p>
      )}
    </Card>
  );
}
