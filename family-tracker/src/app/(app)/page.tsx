import Link from "next/link";
import { Baby, ChevronRight, HeartPulse, Pill, Scale } from "lucide-react";
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
import { getChildren, getDoses, getMedications } from "@/lib/meds-data";
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

function weeksWord(n: number) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "неделя";
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "недели";
  return "недель";
}

export default async function TodayPage() {
  const today = todayKey();
  const [session, health, entries, water, weights, meds, doses, children] = await Promise.all([
    requireFamilySession(),
    getHealthProfile(),
    getFoodEntries(today),
    getWater(today),
    getWeights(addDays(today, -60)),
    getMedications(),
    getDoses(today),
    getChildren(),
  ]);
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

        <DayTotalsCard totals={totals} target={target} href="/food" />

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
            { title: "Задачи на сегодня и привычки", stage: 4 },
            { title: "Цитата дня", stage: 4, shared: true },
            { title: "Мини-тренировка дня", stage: 4, shared: true },
            { title: "Таймер чтения", stage: 4 },
            { title: "Шаги и события календаря", stage: 6 },
          ]}
        />
      </div>
    </>
  );
}
