import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { ProjectBars } from "@/components/ProjectBars";
import { Card } from "@/components/ui";
import { formatMinutes, periodRange, totalsByProject } from "@/lib/timetrack";
import { getProjects, getTimeEntries } from "@/lib/timetrack-data";
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
import { ActivityChart, KcalChart, WeightChart, type CorridorPoint } from "./Charts";
import { getActivities } from "@/lib/activity-data";

export const metadata = { title: "Прогресс — Семья" };

export default async function ProgressPage() {
  const today = todayKey();
  const timeRange = periodRange("week", todayKey());
  const [{ profile }, health, weights, kcalDays, projects, timeEntries, acts] = await Promise.all([
    requireFamilySession(),
    getHealthProfile(),
    getWeights(),
    getDailyKcal(addDays(today, -13)),
    getProjects(true),
    getTimeEntries(timeRange.from),
    getActivities(addDays(today, -13)),
  ]);
  const activityDays = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(today, i - 13);
    const day = acts.filter((a) => a.act_date === date);
    return { date, minutes: day.reduce((s, a) => s + a.minutes, 0), kcal: day.reduce((s, a) => s + a.kcal, 0) };
  });

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

  const projectById = new Map(projects.map((p) => [p.id, p]));
  // eslint-disable-next-line react-hooks/purity -- серверный рендер одного запроса
  const projectTotals = totalsByProject(timeEntries, timeRange.from, timeRange.to, Date.now()).map((t) => ({
    id: t.project_id,
    name: projectById.get(t.project_id)?.name ?? "—",
    slot: projectById.get(t.project_id)?.color_slot ?? 1,
    minutes: t.minutes,
  }));

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

        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Время по проектам за неделю</h2>
            <Link href="/tasks/time" className="text-sm font-medium text-accent">
              Подробнее →
            </Link>
          </div>
          {projectTotals.length ? (
            <>
              <p className="text-sm text-muted">Всего {formatMinutes(projectTotals.reduce((s, t) => s + t.minutes, 0))}</p>
              <ProjectBars items={projectTotals} />
            </>
          ) : (
            <p className="text-sm text-muted">Запустите таймер в «Делах → Время» — здесь появится отчёт.</p>
          )}
        </Card>

        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Активность за 2 недели</h2>
            <Link href="/activity" className="text-sm font-medium text-accent">
              Подробнее →
            </Link>
          </div>
          <ActivityChart days={activityDays} />
        </Card>
      </div>
    </>
  );
}
