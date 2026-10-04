import { X } from "lucide-react";
import { BackHeader } from "@/components/BackHeader";
import { Card, ProgressBar } from "@/components/ui";
import { burnedKcal, kindInfo, workoutDaysInRange } from "@/lib/activity";
import { dayBurn, getActivities, getActivityGoals, getSteps } from "@/lib/activity-data";
import { addDays } from "@/lib/health";
import { dayLabel, weekStartOf } from "@/lib/menu";
import { requireFamilySession } from "@/lib/session";
import { todayKey } from "@/lib/time";
import { deleteActivity } from "./actions";
import { ActivityForm, GoalsForm, StepsForm } from "./Forms";

export const metadata = { title: "Активность — Семья" };

export default async function ActivityPage() {
  const today = todayKey();
  const since = addDays(today, -13);
  const [, activities, steps, goals] = await Promise.all([requireFamilySession(), getActivities(since), getSteps(since), getActivityGoals()]);
  const day = dayBurn(activities, steps, today);
  const burned = burnedKcal(day.workoutKcal, day.activeKcal);
  const week = weekStartOf(today);
  const weekDays = workoutDaysInRange(activities.map((a) => a.act_date), week, addDays(week, 6));
  const todaySteps = steps.find((s) => s.step_date === today);

  return (
    <>
      <BackHeader href="/" title="Активность" />
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3">
          <div className="grid grid-cols-3 text-center">
            <div>
              <p className="text-xl font-bold tabular-nums">{day.steps.toLocaleString("ru-RU")}</p>
              <p className="text-xs text-muted">шагов из {goals.steps.toLocaleString("ru-RU")}</p>
            </div>
            <div>
              <p className="text-xl font-bold tabular-nums">{day.workoutMinutes}</p>
              <p className="text-xs text-muted">мин тренировок</p>
            </div>
            <div>
              <p className="text-xl font-bold tabular-nums">{burned.toLocaleString("ru-RU")}</p>
              <p className="text-xs text-muted">ккал сожжено</p>
            </div>
          </div>
          <ProgressBar value={day.steps} max={goals.steps} />
          <p className="text-xs text-muted">
            Тренировок на этой неделе: {weekDays} из {goals.workoutsWeek}. Сожжённое добавляется к остатку калорий. Если есть
            активные ккал из «Здоровья», берём большее из них и суммы тренировок — чтобы не посчитать дважды.
          </p>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Шаги сегодня</h2>
          <StepsForm today={today} steps={todaySteps?.steps ?? null} activeKcal={todaySteps?.active_kcal ?? null} />
          <p className="mt-2 text-xs text-muted">Автоматически с iPhone — на этапе 6 (Apple Health через «Команды»).</p>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Записать тренировку</h2>
          <ActivityForm today={today} />
        </Card>

        <Card>
          <h2 className="mb-1 font-semibold">За 2 недели</h2>
          {activities.length ? (
            <ul className="flex flex-col divide-y divide-line">
              {activities.map((a) => {
                const k = kindInfo(a.kind);
                const d = dayLabel(a.act_date);
                return (
                  <li key={a.id} className="flex items-center gap-3 py-2.5">
                    <span className="w-7 shrink-0 text-center text-xl" aria-hidden>
                      {k.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{a.note && a.source === "mini" ? `${k.label}: ${a.note}` : k.label}</span>
                      <span className="block truncate text-xs text-muted">
                        {d.short}, {d.long} · {a.minutes} мин · {a.kcal} ккал{a.note && a.source !== "mini" ? ` · ${a.note}` : ""}
                      </span>
                    </span>
                    <form action={deleteActivity}>
                      <input type="hidden" name="id" value={a.id} />
                      <button aria-label={`Удалить: ${k.label}`} className="flex size-8 items-center justify-center rounded-full text-muted active:bg-card-muted">
                        <X className="size-4" aria-hidden />
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted">Пока пусто. Мини-тренировка дня тоже попадёт сюда.</p>
          )}
        </Card>

        <details className="rounded-3xl bg-card p-4 shadow-sm">
          <summary className="cursor-pointer font-semibold">
            Цели: {goals.steps.toLocaleString("ru-RU")} шагов, {goals.workoutsWeek} тренировки в неделю
          </summary>
          <div className="mt-3">
            <GoalsForm steps={goals.steps} workouts={goals.workoutsWeek} />
          </div>
        </details>
      </div>
    </>
  );
}
