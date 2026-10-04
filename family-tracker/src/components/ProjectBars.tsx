import { formatMinutes } from "@/lib/timetrack";

export type ProjectTotal = { id: string; name: string; slot: number; minutes: number };

/**
 * Время по проектам: горизонтальные полосы от общего нуля, у каждой — подпись
 * с названием и временем (цвет проекта не единственный носитель смысла).
 */
export function ProjectBars({ items }: { items: ProjectTotal[] }) {
  const max = Math.max(...items.map((i) => i.minutes), 1);
  return (
    <ul className="flex flex-col gap-3">
      {items.map((i) => (
        <li key={i.id} title={`${i.name}: ${formatMinutes(i.minutes)}`}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: `var(--series-${i.slot})` }} aria-hidden />
              <span className="truncate">{i.name}</span>
            </span>
            <span className="shrink-0 font-medium tabular-nums">{formatMinutes(i.minutes)}</span>
          </div>
          <div className="h-2.5 rounded-r bg-card-muted" aria-hidden>
            <div className="h-full rounded-r" style={{ width: `${Math.max(2, (i.minutes / max) * 100)}%`, background: `var(--series-${i.slot})` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
