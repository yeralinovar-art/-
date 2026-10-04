import Link from "next/link";
import { ChevronRight, Footprints } from "lucide-react";
import { Card, ProgressBar } from "@/components/ui";

/** Активность за день: шаги к цели, тренировки и сожжённые ккал. */
export function ActivityCard({
  steps,
  stepsGoal,
  workoutMinutes,
  burned,
}: {
  steps: number;
  stepsGoal: number;
  workoutMinutes: number;
  burned: number;
}) {
  return (
    <Link href="/activity" className="block active:opacity-90">
      <Card className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold">
            <Footprints className="size-5 text-accent" aria-hidden />
            Активность
          </h2>
          <ChevronRight className="size-5 text-muted" aria-hidden />
        </div>
        <div className="flex items-baseline justify-between text-sm">
          <span>
            <span className="text-lg font-semibold tabular-nums">{steps.toLocaleString("ru-RU")}</span>
            <span className="text-muted"> / {stepsGoal.toLocaleString("ru-RU")} шагов</span>
          </span>
          <span className="text-muted">
            {workoutMinutes ? `${workoutMinutes} мин · ` : ""}сожжено {burned.toLocaleString("ru-RU")} ккал
          </span>
        </div>
        <ProgressBar value={steps} max={stepsGoal} />
      </Card>
    </Link>
  );
}
