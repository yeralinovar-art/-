import Link from "next/link";
import { ComingSoon } from "@/components/ComingSoon";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui";
import { getDailyKcal, getHealthProfile, getWeights } from "@/lib/data";
import {
  addDays,
  dailyKcalTarget,
  gainCorridorAtWeek,
  movingAverage7,
  pregnancyOn,
  totalGainCorridor,
} from "@/lib/health";
import { requireFamilySession } from "@/lib/session";
import { todayKey } from "@/lib/time";
import { KcalChart, WeightChart, type CorridorPoint } from "./Charts";

export const metadata = { title: "Прогресс — Семья" };

export default async function ProgressPage() {
  const today = todayKey();
  const [{ profile }, health, weights, kcalDays] = await Promise.all([
    requireFamilySession(),
    getHealthProfile(),
    getWeights(),
    getDailyKcal(addDays(today, -13)),
  ]);

  const points = movingAverage7(weights).map((p) => ({ date: p.date, kg: p.kg, avg: p.avg }));
  const target = dailyKcalTarget(health, weights.at(-1)?.kg ?? null, today);

  // Коридор набора при беременности: точка на каждую неделю от зачатия до родов.
  let corridor: CorridorPoint[] | null = null;
  const total = totalGainCorridor(health);
  if (health.is_pregnant && health.due_date && health.pre_pregnancy_weight_kg && total && pregnancyOn(health.due_date, today)) {
    const start = addDays(health.due_date, -280);
    corridor = Array.from({ length: 41 }, (_, week) => {
      const c = gainCorridorAtWeek(week, total);
      const base = health.pre_pregnancy_weight_kg as number;
      return { date: addDays(start, week * 7), min: base + c.min, max: base + c.max, target: base + c.min };
    });
  }

  return (
    <>
      <PageHeader title="Прогресс" subtitle="Видно только вам" profile={profile} />
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Вес</h2>
            <Link href="/weight" className="text-sm font-medium text-accent">
              Все записи →
            </Link>
          </div>
          <WeightChart
            points={points}
            corridor={corridor}
            goalKg={health.is_pregnant ? null : health.goal_weight_kg}
            today={today}
          />
        </Card>

        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Калории за 2 недели</h2>
            <Link href="/food" className="text-sm font-medium text-accent">
              Дневник →
            </Link>
          </div>
          <KcalChart days={kcalDays.sort((a, b) => a.date.localeCompare(b.date))} target={target?.kcal ?? null} />
        </Card>

        <ComingSoon
          items={[
            { title: "Активность и тренировки", stage: 4 },
            { title: "Время по проектам", stage: 4 },
          ]}
        />
      </div>
    </>
  );
}
