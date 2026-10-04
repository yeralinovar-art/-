import { BackHeader } from "@/components/BackHeader";
import { DoctorNote } from "@/components/DoctorNote";
import { Card } from "@/components/ui";
import { getHealthProfile } from "@/lib/data";
import { pregnancyOn } from "@/lib/health";
import { requireFamilySession } from "@/lib/session";
import { todayKey } from "@/lib/time";
import { buildSteps, totalMinutes, workoutForDay, type Version } from "@/lib/workouts";
import { Player } from "./Player";

export const metadata = { title: "Мини-тренировка — Семья" };

export default async function WorkoutPage({ searchParams }: PageProps<"/workout">) {
  const params = await searchParams;
  const today = todayKey();
  const [, health] = await Promise.all([requireFamilySession(), getHealthProfile()]);
  const preg = health.is_pregnant && health.due_date ? pregnancyOn(health.due_date, today) : null;
  const version: Version = preg ? "pregnancy" : "regular";
  const workout = workoutForDay(today);
  const steps = buildSteps(workout, version, preg?.trimester ?? null);
  const minutes = totalMinutes(steps);

  return (
    <>
      <BackHeader href="/" title={workout.title} />
      <div className="flex flex-col gap-4">
        <p className="-mt-2 text-sm text-muted">
          {workout.focus} · ~{minutes} мин · {preg ? `версия для беременных, ${preg.trimester} триместр` : "обычная версия"}
        </p>
        {preg ? (
          <DoctorNote>
            Занимайтесь только с разрешения врача. Остановитесь и свяжитесь с врачом при боли, головокружении, одышке, кровотечении,
            подтекании вод или схватках. Темп — такой, чтобы можно было разговаривать.
          </DoctorNote>
        ) : (
          <p className="text-xs text-muted">При боли или головокружении — остановитесь. Техника важнее скорости.</p>
        )}
        {params.finished === "1" ? (
          <Card className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="text-4xl" aria-hidden>
              🎉
            </p>
            <h2 className="text-xl font-semibold">Тренировка сделана!</h2>
            <p className="text-sm text-muted">Записали в активность. Отметку видит и партнёр.</p>
          </Card>
        ) : (
          <Player steps={steps} workoutKey={workout.key} version={version} minutes={minutes} />
        )}
      </div>
    </>
  );
}
