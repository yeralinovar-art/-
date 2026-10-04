import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { CaffeineCard } from "@/components/CaffeineCard";
import { DayTotalsCard } from "@/components/DayTotalsCard";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui";
import { WaterCard } from "@/components/WaterCard";
import { MEALS, getFoodEntries, getHealthProfile, getLatestWeight, getWater, sumEntries } from "@/lib/data";
import { isDate } from "@/lib/form";
import { addDays, dailyKcalTarget } from "@/lib/health";
import { requireFamilySession } from "@/lib/session";
import { todayKey } from "@/lib/time";
import { deleteFoodEntry } from "./actions";

export const metadata = { title: "Питание — Семья" };

function dayTitle(date: string, today: string) {
  if (date === today) return "Сегодня";
  if (date === addDays(today, -1)) return "Вчера";
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

export default async function FoodPage({ searchParams }: PageProps<"/food">) {
  const today = todayKey();
  const raw = (await searchParams).date;
  const date = typeof raw === "string" && isDate(raw) && raw <= today ? raw : today;

  const [{ profile }, health, entries, water, latest] = await Promise.all([
    requireFamilySession(),
    getHealthProfile(),
    getFoodEntries(date),
    getWater(date),
    getLatestWeight(),
  ]);
  const totals = sumEntries(entries);
  const target = dailyKcalTarget(health, latest?.kg ?? null, date);
  const href = (d: string) => (d === today ? "/food" : `/food?date=${d}`);

  return (
    <>
      <PageHeader title="Питание" subtitle="Мой дневник" profile={profile} />

      <nav className="mb-4 flex items-center justify-between rounded-2xl bg-card p-1 shadow-sm" aria-label="Выбор дня">
        <Link href={href(addDays(date, -1))} aria-label="Предыдущий день" className="flex size-11 items-center justify-center rounded-xl active:bg-card-muted">
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
        <span className="font-semibold first-letter:uppercase">{dayTitle(date, today)}</span>
        {date < today ? (
          <Link href={href(addDays(date, 1))} aria-label="Следующий день" className="flex size-11 items-center justify-center rounded-xl active:bg-card-muted">
            <ChevronRight className="size-5" aria-hidden />
          </Link>
        ) : (
          <span className="size-11" />
        )}
      </nav>

      <div className="flex flex-col gap-4">
        <DayTotalsCard totals={totals} target={target} />

        {MEALS.map((m) => {
          const items = entries.filter((e) => e.meal === m.value);
          const kcal = items.reduce((s, e) => s + e.kcal, 0);
          return (
            <Card key={m.value}>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">
                  {m.label}
                  {kcal > 0 && <span className="ml-2 text-sm font-normal text-muted">{Math.round(kcal)} ккал</span>}
                </h2>
                <Link
                  href={`/food/add?meal=${m.value}${date === today ? "" : `&date=${date}`}`}
                  aria-label={`Добавить: ${m.label}`}
                  className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent active:scale-95"
                >
                  <Plus className="size-5" aria-hidden />
                </Link>
              </div>
              {items.length > 0 && (
                <ul className="mt-2 flex flex-col divide-y divide-line">
                  {items.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate">{e.name}</p>
                        <p className="text-xs text-muted">
                          {e.grams ? `${e.grams.toLocaleString("ru-RU")} ${e.unit} · ` : ""}
                          {Math.round(e.kcal)} ккал · Б {Math.round(e.protein)} · Ж {Math.round(e.fat)} · У {Math.round(e.carbs)}
                        </p>
                      </div>
                      <form action={deleteFoodEntry}>
                        <input type="hidden" name="id" value={e.id} />
                        <button type="submit" aria-label={`Удалить: ${e.name}`} className="flex size-10 items-center justify-center rounded-full text-muted active:bg-card-muted">
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}

        <WaterCard ml={water} goal={health.water_goal_ml} date={date} />

        {health.is_pregnant && <CaffeineCard mg={totals.caffeine} limit={health.caffeine_limit_mg} date={date} />}
      </div>
    </>
  );
}
