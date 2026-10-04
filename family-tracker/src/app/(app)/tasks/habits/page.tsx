import { HabitList } from "@/components/HabitList";
import { PageHeader } from "@/components/PageHeader";
import { Card, ProgressBar } from "@/components/ui";
import { weekStartOf } from "@/lib/menu";
import { requireFamilySession } from "@/lib/session";
import { countInWeek, dueLabel, goalPercent, habitStreak, streakLabel } from "@/lib/tasks";
import { getGoals, getHabits } from "@/lib/tasks-data";
import { todayKey } from "@/lib/time";
import { archiveHabit, deleteGoal, toggleGoalDone } from "../actions";
import { TasksTabs } from "../TasksTabs";
import { GoalForm, GoalProgressForm, HabitForm } from "./Forms";

export const metadata = { title: "Привычки и цели — Семья" };

const nf = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 1 });

export default async function HabitsPage() {
  const today = todayKey();
  const [session, { habits, checks }, goals] = await Promise.all([requireFamilySession(), getHabits(today), getGoals()]);
  const week = weekStartOf(today);
  const items = habits.map((h) => {
    const dates = checks.get(h.id) ?? new Set<string>();
    const streak = habitStreak(h, dates, today);
    const hint =
      h.frequency === "daily"
        ? streakLabel(streak, "daily")
        : [`${countInWeek(dates, week)} из ${h.target_per_week} на этой неделе`, streakLabel(streak, "weekly")].filter(Boolean).join(" · ");
    return { id: h.id, title: h.title, emoji: h.emoji, checked: dates.has(today), hint };
  });
  const doneToday = items.filter((i) => i.checked).length;

  return (
    <>
      <PageHeader title="Дела" subtitle="Привычки и цели — только ваши" profile={session.profile} />
      <TasksTabs />
      <div className="flex flex-col gap-4">
        <Card>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-semibold">Привычки сегодня</h2>
            {items.length > 0 && (
              <span className="text-sm text-muted">
                {doneToday} из {items.length}
              </span>
            )}
          </div>
          {items.length ? (
            <HabitList items={items} date={today} />
          ) : (
            <p className="py-1 text-sm text-muted">Добавьте 1–3 привычки: например, «10 минут прогулки» или «без сладкого после 18:00».</p>
          )}
          <details className="mt-3 rounded-2xl bg-card-muted p-3">
            <summary className="cursor-pointer font-medium text-accent">+ Добавить привычку</summary>
            <div className="mt-3">
              <HabitForm />
            </div>
          </details>
          {habits.length > 0 && (
            <details className="mt-2 rounded-2xl p-1">
              <summary className="cursor-pointer text-sm text-muted">Убрать привычку</summary>
              <ul className="mt-2 flex flex-col gap-1">
                {habits.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">
                      {h.emoji} {h.title}
                    </span>
                    <form action={archiveHabit}>
                      <input type="hidden" name="id" value={h.id} />
                      <button className="min-h-9 px-2 text-danger" aria-label={`Убрать привычку ${h.title}`}>
                        Убрать
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="font-semibold">Цели</h2>
          {goals.length === 0 && <p className="text-sm text-muted">Например: «Прочитать 12 книг» к 31 декабря или «Накопить на коляску».</p>}
          {goals.map((g) => {
            const pct = goalPercent(g.current, g.target);
            const due = g.done ? null : dueLabel(g.deadline, today);
            return (
              <details key={g.id} className="rounded-2xl bg-card-muted p-3">
                <summary className="flex cursor-pointer list-none flex-col gap-2 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={`truncate font-medium ${g.done ? "text-muted line-through" : ""}`}>{g.title}</span>
                    <span className="shrink-0 text-sm text-muted">
                      {g.target ? `${nf(g.current)} / ${nf(g.target)}${g.unit ? ` ${g.unit}` : ""}` : g.done ? "готово" : ""}
                    </span>
                  </span>
                  {pct !== null && <ProgressBar value={pct} max={100} />}
                  {(due || g.done) && (
                    <span className={`text-xs ${due?.tone === "danger" ? "text-danger" : "text-muted"}`}>
                      {g.done ? "Цель достигнута 🎉" : `срок: ${due?.text}`}
                    </span>
                  )}
                </summary>
                <div className="mt-3 flex flex-col gap-2">
                  {g.target && !g.done && <GoalProgressForm id={g.id} current={g.current} unit={g.unit} />}
                  <div className="flex gap-2">
                    <form action={toggleGoalDone} className="flex-1">
                      <input type="hidden" name="id" value={g.id} />
                      <input type="hidden" name="done" value={g.done ? "0" : "1"} />
                      <button className="min-h-10 w-full rounded-xl bg-card text-sm font-medium">{g.done ? "Вернуть в работу" : "Отметить достигнутой"}</button>
                    </form>
                    <form action={deleteGoal}>
                      <input type="hidden" name="id" value={g.id} />
                      <button className="min-h-10 rounded-xl px-3 text-sm text-danger">Удалить</button>
                    </form>
                  </div>
                </div>
              </details>
            );
          })}
          <details className="rounded-2xl border border-dashed border-line p-3">
            <summary className="cursor-pointer font-medium text-accent">+ Новая цель</summary>
            <div className="mt-3">
              <GoalForm />
            </div>
          </details>
        </Card>
      </div>
    </>
  );
}
