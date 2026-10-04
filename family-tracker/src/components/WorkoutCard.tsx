import Link from "next/link";
import { Dumbbell, Flame } from "lucide-react";
import { logWorkout, undoWorkout } from "@/app/(app)/activity/actions";
import { Card, FamilyBadge, SubmitButton } from "@/components/ui";
import type { Version, Workout } from "@/lib/workouts";

type Status = "done" | "skipped" | null;

const statusText = (s: Status, me: boolean) =>
  s === "done" ? (me ? "сделано ✓" : "сделал(а) ✓") : s === "skipped" ? "пропуск по самочувствию" : me ? "ещё не сделано" : "пока нет";

/** Мини-тренировка дня: у каждого своя версия, отметки видны обоим, серия общая. */
export function WorkoutCard({
  workout,
  version,
  minutes,
  myStatus,
  partner,
  streak,
}: {
  workout: Workout;
  version: Version;
  minutes: number;
  myStatus: Status;
  partner: { name: string; status: Status } | null;
  streak: number;
}) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <Dumbbell className="size-5 text-accent" aria-hidden />
          Мини-тренировка дня
        </h2>
        <FamilyBadge label="Вместе" />
      </div>
      <div>
        <p className="text-lg font-semibold">{workout.title}</p>
        <p className="text-sm text-muted">
          {workout.focus} · ~{minutes} мин · {version === "pregnancy" ? "версия для беременных" : "обычная версия"}
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-2 text-sm">
        <li className="rounded-2xl bg-card-muted px-3 py-2">
          <span className="block text-xs text-muted">Я</span>
          {statusText(myStatus, true)}
        </li>
        {partner && (
          <li className="rounded-2xl bg-card-muted px-3 py-2">
            <span className="block truncate text-xs text-muted">{partner.name}</span>
            {statusText(partner.status, false)}
          </li>
        )}
      </ul>
      {streak > 0 && (
        <p className="flex items-center gap-1.5 text-sm text-family">
          <Flame className="size-4" aria-hidden />
          Общая серия: {streak} дн.
        </p>
      )}
      {myStatus ? (
        <form action={undoWorkout}>
          <button className="text-sm text-muted underline">Отменить отметку</button>
        </form>
      ) : (
        <div className="flex flex-col gap-2">
          <Link
            href="/workout"
            className="flex min-h-12 items-center justify-center rounded-2xl bg-accent px-5 font-semibold text-accent-text active:scale-[0.98]"
          >
            Начать тренировку
          </Link>
          <form action={logWorkout}>
            <input type="hidden" name="workout_key" value={workout.key} />
            <input type="hidden" name="version" value={version} />
            <input type="hidden" name="status" value="skipped" />
            <SubmitButton variant="secondary" className="min-h-10! text-sm" pendingText="…">
              Плохо себя чувствую — пропустить (серия сохранится)
            </SubmitButton>
          </form>
        </div>
      )}
    </Card>
  );
}
