import Link from "next/link";
import { Baby, BellRing, CheckSquare, ChevronRight, HeartPulse, Pill, Repeat, Scale, UtensilsCrossed } from "lucide-react";
import { CaffeineCard } from "@/components/CaffeineCard";
import { ComingSoon } from "@/components/ComingSoon";
import { DayTotalsCard } from "@/components/DayTotalsCard";
import { DoctorNote } from "@/components/DoctorNote";
import { PageHeader } from "@/components/PageHeader";
import { Card, FamilyBadge } from "@/components/ui";
import { WaterCard } from "@/components/WaterCard";
import { DoseList } from "@/components/DoseList";
import { getFoodEntries, getHealthProfile, getWater, getWeights, sumEntries } from "@/lib/data";
import { toDoseItems } from "@/lib/dose-items";
import { VisitRow } from "@/components/VisitRow";
import { upcomingVisits } from "@/lib/family-health";
import { getChildren, getDoses, getMedications, getVisits } from "@/lib/meds-data";
import { getPlan } from "@/lib/menu-data";
import { HabitList } from "@/components/HabitList";
import { TaskList } from "@/components/TaskList";
import { weekStartOf } from "@/lib/menu";
import { toTaskItems } from "@/lib/task-items";
import { countInWeek, everyLabel, habitStreak, inView, sortTasks, streakLabel } from "@/lib/tasks";
import { getChores, getHabits, getTasks } from "@/lib/tasks-data";
import { ReadingCard } from "@/components/ReadingCard";
import { TimerCard } from "@/components/TimerCard";
import { readingByDay, readingStreak } from "@/lib/timetrack";
import { getBooks, getProjects, getReading, getReadingGoal, getRunningTimer } from "@/lib/timetrack-data";
import {
  addDays,
  dailyKcalTarget,
  fmt,
  pregnancyOn,
  pregnancyWeightStatus,
  sharpWeightChange,
} from "@/lib/health";
import { requireFamilySession } from "@/lib/session";
import { formatLongDate, greeting, todayKey } from "@/lib/time";

const TRIMESTER = ["", "I", "II", "III"];
const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"];

function weeksWord(n: number) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "неделя";
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "недели";
  return "недель";
}

export default async function TodayPage() {
  const today = todayKey();
  const [session, health, entries, water, weights, meds, doses, children, visits, menu, tasks, habitData, chores, projects, timer, reading, books] = await Promise.all([
    requireFamilySession(),
    getHealthProfile(),
    getFoodEntries(today),
    getWater(today),
    getWeights(addDays(today, -60)),
    getMedications(),
    getDoses(today),
    getChildren(),
    getVisits(),
    getPlan(today, today),
    getTasks(today),
    getHabits(today),
    getChores(),
    getProjects(),
    getRunningTimer(),
    getReading(today),
    getBooks(),
  ]);
  const readingGoal = await getReadingGoal(session.userId);
  const readDays = readingByDay(reading.sessions);
  // eslint-disable-next-line react-hooks/purity -- серверный рендер одного запроса
  const now = Date.now();
  const soonVisits = upcomingVisits(visits, today, 7);
  const todayTasks = sortTasks(
    tasks.filter((t) => inView(t, "today", today) && (!t.shared || !t.assignee_id || t.assignee_id === session.userId)),
  );
  const week = weekStartOf(today);
  const habitItems = habitData.habits.map((h) => {
    const dates = habitData.checks.get(h.id) ?? new Set<string>();
    const streak = habitStreak(h, dates, today);
    return {
      id: h.id,
      title: h.title,
      emoji: h.emoji,
      checked: dates.has(today),
      hint:
        h.frequency === "daily"
          ? streakLabel(streak, "daily")
          : `${countInWeek(dates, week)} из ${h.target_per_week} на неделе`,
    };
  });
  const dueChores = chores.filter((c) => c.next_due <= today && (!c.assignee_id || c.assignee_id === session.userId));
  // Что сделал или поручил партнёр — пока без push-уведомлений (этап 7).
  const partnerId = session.partner?.id;
  const since = Date.parse(`${addDays(today, -3)}T00:00:00+05:00`);
  const news = partnerId
    ? [
        ...tasks
          .filter((t) => t.shared && t.owner_id === partnerId && t.assignee_id === session.userId && t.status !== "done" && Date.parse(t.created_at) >= since)
          .map((t) => ({ id: t.id, text: `поручил(а) вам: ${t.title}` })),
        ...tasks
          .filter((t) => t.shared && t.done_by === partnerId && Date.parse(t.done_at ?? "") >= Date.parse(`${today}T00:00:00+05:00`))
          .map((t) => ({ id: `d-${t.id}`, text: `сделал(а): ${t.title}` })),
      ].slice(0, 5)
    : [];
  const { profile, family, partner } = session;
  const doseItems = toDoseItems(meds, doses, today, children, session);
  const dosesLeft = doseItems.filter((d) => !d.takenLabel).length;

  const last = weights.at(-1) ?? null;
  const totals = sumEntries(entries);
  const target = dailyKcalTarget(health, last?.kg ?? null, today);
  const preg = health.is_pregnant && health.due_date ? pregnancyOn(health.due_date, today) : null;
  const pregStatus = last ? pregnancyWeightStatus(health, last.kg, today) : null;
  const sharp = sharpWeightChange(weights, Boolean(preg));

  return (
    <>
      <PageHeader title={`${greeting()}, ${profile.display_name}`} subtitle={formatLongDate()} profile={profile} />

      <div className="flex flex-col gap-4">
        {!health.exists && (
          <Link href="/profile/health" className="block active:opacity-90">
            <Card className="flex items-center gap-3 bg-accent-soft">
              <HeartPulse className="size-8 shrink-0 text-accent" aria-hidden />
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">Заполните профиль здоровья</h2>
                <p className="text-sm text-muted">Рост, активность и цели — чтобы посчитать норму калорий. 1 минута.</p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
            </Card>
          </Link>
        )}

        {preg && (
          <Card className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-family-soft text-family">
                <Baby className="size-6" aria-hidden />
              </span>
              <div>
                <h2 className="text-lg font-semibold">
                  {preg.weeks} {weeksWord(preg.weeks)}
                  {preg.days > 0 ? ` ${preg.days} дн.` : ""}
                </h2>
                <p className="text-sm text-muted">
                  {TRIMESTER[preg.trimester]} триместр · до родов {preg.daysLeft} дн.
                </p>
              </div>
            </div>
            <p className="text-xs text-muted">Рекомендации приложения не заменяют консультацию врача.</p>
          </Card>
        )}

        <Card>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <Pill className="size-5 text-accent" aria-hidden />
              Витамины
            </h2>
            <Link href="/meds" className="text-sm font-medium text-accent">
              {doseItems.length ? (dosesLeft ? `осталось ${dosesLeft}` : "всё принято ✓") : "Настроить"} →
            </Link>
          </div>
          {doseItems.length > 0 ? (
            <DoseList items={doseItems} date={today} />
          ) : (
            <p className="py-1 text-sm text-muted">Добавьте витамины и лекарства по схеме врача — будем отмечать приём.</p>
          )}
        </Card>

        {soonVisits.length > 0 && (
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Визиты на неделе</h2>
              <Link href="/visits" className="text-sm font-medium text-accent">
                Все →
              </Link>
            </div>
            <ul className="flex flex-col divide-y divide-line">
              {soonVisits.map((v) => (
                <li key={v.id}>
                  <VisitRow visit={v} who={v.child_id ? (children.find((c) => c.id === v.child_id)?.name ?? null) : null} />
                </li>
              ))}
            </ul>
          </Card>
        )}

        {news.length > 0 && session.partner && (
          <Card className="flex flex-col gap-1 bg-family-soft">
            <h2 className="flex items-center gap-2 font-semibold text-family">
              <BellRing className="size-5" aria-hidden />
              {session.partner.avatar_emoji} {session.partner.display_name}
            </h2>
            <ul className="text-sm">
              {news.map((n) => (
                <li key={n.id}>{n.text}</li>
              ))}
            </ul>
          </Card>
        )}

        <Card>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <CheckSquare className="size-5 text-accent" aria-hidden />
              Задачи на сегодня
            </h2>
            <Link href="/tasks" className="text-sm font-medium text-accent">
              Все →
            </Link>
          </div>
          {todayTasks.length ? (
            <TaskList items={toTaskItems(todayTasks.slice(0, 6), session, today)} back="/" />
          ) : (
            <p className="py-1 text-sm text-muted">
              На сегодня ничего.{" "}
              <Link href="/tasks/new?back=%2F" className="font-medium text-accent">
                Добавить задачу
              </Link>
            </p>
          )}
          {todayTasks.length > 6 && <p className="pt-1 text-xs text-muted">и ещё {todayTasks.length - 6}</p>}
        </Card>

        {habitItems.length > 0 && (
          <Card>
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-semibold">Привычки</h2>
              <Link href="/tasks/habits" className="text-sm font-medium text-accent">
                {habitItems.filter((h) => h.checked).length} из {habitItems.length} →
              </Link>
            </div>
            <HabitList items={habitItems} date={today} />
          </Card>
        )}

        {(timer || projects.length > 0) && <TimerCard projects={projects} running={timer} serverNow={now} compact />}

        <ReadingCard
          minutesToday={readDays.get(today) ?? 0}
          goal={readingGoal}
          streak={readingStreak(readDays, readingGoal, today)}
          running={reading.running}
          books={books.filter((b) => b.status === "reading")}
          serverNow={now}
          link
        />

        {dueChores.length > 0 && (
          <Link href="/tasks/family" className="block active:opacity-90">
            <Card className="flex items-center gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-family-soft text-family">
                <Repeat className="size-6" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">Домашние дела</h2>
                <p className="truncate text-sm text-muted">
                  {dueChores.map((c) => `${c.emoji} ${c.title}`).join(" · ")} — ваша очередь ({everyLabel(dueChores[0].every_days)})
                </p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
            </Card>
          </Link>
        )}

        <DayTotalsCard totals={totals} target={target} href="/food" />

        <Link href={`/menu#d-${today}`} className="block active:opacity-90">
          <Card className="flex items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-family-soft text-family">
              <UtensilsCrossed className="size-6" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">Сегодня в меню</h2>
              <p className="truncate text-sm text-muted">
                {menu.length
                  ? [...menu].sort((a, b) => MEAL_ORDER.indexOf(a.meal) - MEAL_ORDER.indexOf(b.meal)).map((m) => m.title).join(" · ")
                  : "Ничего не запланировано — добавьте блюда на неделю"}
              </p>
            </div>
            <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
          </Card>
        </Link>

        <Link href="/weight" className="block active:opacity-90">
          <Card className="flex items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <Scale className="size-6" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              {last ? (
                <>
                  <h2 className="text-lg font-semibold">{fmt(last.kg)} кг</h2>
                  <p className="truncate text-sm text-muted">
                    {last.date === today ? "сегодня" : `последняя запись ${last.date.split("-").reverse().slice(0, 2).join(".")}`}
                    {pregStatus
                      ? ` · набор ${pregStatus.gainKg >= 0 ? "+" : ""}${fmt(pregStatus.gainKg)} кг`
                      : ""}
                  </p>
                </>
              ) : (
                <>
                  <h2 className="font-semibold">Записать вес</h2>
                  <p className="text-sm text-muted">Утром, до завтрака</p>
                </>
              )}
            </div>
            {last?.date !== today && (
              <span className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-text">Взвеситься</span>
            )}
          </Card>
        </Link>

        {sharp !== null && (
          <DoctorNote>
            Вес заметно изменился за неделю ({sharp > 0 ? "+" : ""}
            {fmt(sharp)} кг). Обсудите это с врачом.
          </DoctorNote>
        )}

        <WaterCard ml={water} goal={health.water_goal_ml} date={today} />

        {preg && <CaffeineCard mg={totals.caffeine} limit={health.caffeine_limit_mg} date={today} />}

        <Card className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <h2 className="truncate font-semibold">{family.name}</h2>
              <FamilyBadge label="Семья" />
            </div>
            {partner ? (
              <p className="text-sm text-muted">
                Вы и {partner.avatar_emoji} {partner.display_name}
              </p>
            ) : (
              <p className="text-sm text-muted">Партнёр ещё не присоединился</p>
            )}
          </div>
          {!partner && (
            <Link href="/profile" className="shrink-0 rounded-2xl bg-family-soft px-4 py-2.5 text-sm font-semibold text-family">
              Пригласить
            </Link>
          )}
        </Card>

        <ComingSoon
          items={[
            { title: "Цитата дня", stage: 4, shared: true },
            { title: "Мини-тренировка дня", stage: 4, shared: true },
            { title: "Шаги и события календаря", stage: 6 },
          ]}
        />
      </div>
    </>
  );
}
