import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, ShoppingCart, X } from "lucide-react";
import { Card, SubmitButton } from "@/components/ui";
import { MEALS } from "@/lib/data";
import { isDate } from "@/lib/form";
import { addDays } from "@/lib/health";
import { dayLabel, weekDays, weekLabel, weekStartOf } from "@/lib/menu";
import { getPlan, getRecipes } from "@/lib/menu-data";
import { requireFamilySession } from "@/lib/session";
import { todayKey } from "@/lib/time";
import { buildShoppingFromMenu, copyPreviousWeek, deletePlanItem, eatPlanItem } from "./actions";
import { MenuHeader } from "./MenuHeader";

export const metadata = { title: "Меню — Семья" };

const MEAL_LABEL = Object.fromEntries(MEALS.map((m) => [m.value, m.label === "Перекусы" ? "Перекус" : m.label]));
const MEAL_ORDER = Object.fromEntries(MEALS.map((m, i) => [m.value, i]));
const nf = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 1 });

export default async function MenuPage({ searchParams }: PageProps<"/menu">) {
  const params = await searchParams;
  const today = todayKey();
  const start = typeof params.week === "string" && isDate(params.week) ? weekStartOf(params.week) : weekStartOf(today);
  const days = weekDays(start);
  const [session, plan, recipes] = await Promise.all([requireFamilySession(), getPlan(days[0], days[6]), getRecipes()]);
  const kcal = new Map(recipes.map((r) => [r.id, r.perServing.kcal]));
  const thisWeek = start === weekStartOf(today);

  return (
    <>
      <MenuHeader profile={session.profile} subtitle="На неделю для всей семьи" />
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/menu?week=${addDays(start, -7)}`}
            aria-label="Прошлая неделя"
            className="flex size-11 items-center justify-center rounded-full bg-card shadow-sm active:scale-95"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
          <div className="text-center">
            <p className="font-semibold">{weekLabel(start)}</p>
            {thisWeek ? (
              <p className="text-xs text-muted">эта неделя</p>
            ) : (
              <Link href="/menu" className="text-xs font-medium text-accent">
                к этой неделе
              </Link>
            )}
          </div>
          <Link
            href={`/menu?week=${addDays(start, 7)}`}
            aria-label="Следующая неделя"
            className="flex size-11 items-center justify-center rounded-full bg-card shadow-sm active:scale-95"
          >
            <ChevronRight className="size-5" aria-hidden />
          </Link>
        </div>

        {plan.length > 0 ? (
          <form action={buildShoppingFromMenu}>
            <input type="hidden" name="week" value={start} />
            <SubmitButton pendingText="Собираю список…">
              <span className="inline-flex items-center gap-2">
                <ShoppingCart className="size-5" aria-hidden />
                Собрать список покупок
              </span>
            </SubmitButton>
          </form>
        ) : (
          <Card className="flex flex-col gap-3">
            <p className="text-sm text-muted">
              На эту неделю пока ничего. Добавьте блюда в нужные дни — список покупок соберётся сам, а «Съел(а)» запишет
              калории в дневник.
            </p>
            <form action={copyPreviousWeek}>
              <input type="hidden" name="week" value={start} />
              <SubmitButton variant="secondary" pendingText="Копирую…">
                Повторить прошлую неделю
              </SubmitButton>
            </form>
          </Card>
        )}

        {days.map((date) => {
          const items = plan
            .filter((p) => p.plan_date === date)
            .sort((a, b) => MEAL_ORDER[a.meal] - MEAL_ORDER[b.meal]);
          const d = dayLabel(date);
          const isToday = date === today;
          return (
            <Card key={date} className={isToday ? "ring-2 ring-accent" : ""}>
              <div id={`d-${date}`} className="flex scroll-mt-4 items-center justify-between gap-2">
                <h2 className="font-semibold">
                  {d.short}, {d.long}
                  {isToday && <span className="ml-2 text-sm font-medium text-accent">сегодня</span>}
                </h2>
                <Link
                  href={`/menu/add?date=${date}`}
                  aria-label={`Добавить блюдо: ${d.short}, ${d.long}`}
                  className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent active:scale-95"
                >
                  <Plus className="size-5" aria-hidden />
                </Link>
              </div>
              {items.length > 0 ? (
                <ul className="mt-1 flex flex-col divide-y divide-line">
                  {items.map((item) => {
                    const k = item.recipe_id ? kcal.get(item.recipe_id) : undefined;
                    return (
                      <li key={item.id} className="flex items-center gap-2 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-muted">{MEAL_LABEL[item.meal]}</p>
                          {item.recipe_id ? (
                            <Link href={`/menu/recipes/${item.recipe_id}?servings=${item.servings}`} className="block truncate font-medium">
                              {item.title}
                            </Link>
                          ) : (
                            <p className="truncate font-medium">{item.title}</p>
                          )}
                          <p className="truncate text-xs text-muted">
                            {nf(item.servings)} порц.
                            {k !== undefined ? ` · ${k} ккал на порцию` : ""}
                            {item.note ? ` · ${item.note}` : ""}
                          </p>
                        </div>
                        <details className="relative shrink-0">
                          <summary className="flex min-h-9 cursor-pointer list-none items-center rounded-full bg-card-muted px-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                            Съел(а)
                          </summary>
                          <form action={eatPlanItem} className="absolute right-0 z-10 mt-1 flex w-44 flex-col gap-1 rounded-2xl bg-card p-2 shadow-lg ring-1 ring-line">
                            <input type="hidden" name="id" value={item.id} />
                            {item.recipe_id ? (
                              <>
                                <p className="px-2 pb-1 text-xs text-muted">В мой дневник:</p>
                                {[0.5, 1, 1.5].map((p) => (
                                  <button
                                    key={p}
                                    name="portion"
                                    value={p}
                                    className="min-h-10 rounded-xl px-3 text-left text-sm font-medium active:bg-card-muted"
                                  >
                                    {p === 0.5 ? "½ порции" : p === 1 ? "1 порция" : "1½ порции"}
                                    {k !== undefined && <span className="text-muted"> · {Math.round(k * p)} ккал</span>}
                                  </button>
                                ))}
                              </>
                            ) : (
                              <button className="min-h-10 rounded-xl px-3 text-left text-sm font-medium active:bg-card-muted">
                                Записать в дневник →
                              </button>
                            )}
                          </form>
                        </details>
                        <form action={deletePlanItem}>
                          <input type="hidden" name="id" value={item.id} />
                          <button
                            aria-label={`Убрать из меню: ${item.title}`}
                            className="flex size-9 items-center justify-center rounded-full text-muted active:bg-card-muted"
                          >
                            <X className="size-4" aria-hidden />
                          </button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="pt-1 text-sm text-muted">Пока пусто</p>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
