import Link from "next/link";
import { ChevronRight, FlaskConical, ScanLine, Stethoscope, type LucideIcon } from "lucide-react";
import type { Visit, VisitKind } from "@/lib/family-health";

const ICON: Record<VisitKind, LucideIcon> = {
  doctor: Stethoscope,
  ultrasound: ScanLine,
  tests: FlaskConical,
  other: Stethoscope,
};

export function visitDateLabel(v: Pick<Visit, "visit_date" | "visit_time">) {
  const d = new Date(`${v.visit_date}T12:00:00Z`).toLocaleDateString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  return v.visit_time ? `${d}, ${v.visit_time}` : d;
}

/** Строка визита: дата, что, для кого, отметка «готово». */
export function VisitRow({ visit, who }: { visit: Visit; who: string | null }) {
  const Icon = ICON[visit.kind];
  return (
    <Link href={`/visits/${visit.id}`} className="flex items-center gap-3 py-3">
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${
          visit.done ? "bg-card-muted text-muted" : "bg-accent-soft text-accent"
        }`}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{visit.title}</span>
        <span className="block truncate text-xs text-muted first-letter:uppercase">
          {[visitDateLabel(visit), who, visit.place, visit.done ? (visit.result ? "есть итог" : "прошёл") : null]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
    </Link>
  );
}
