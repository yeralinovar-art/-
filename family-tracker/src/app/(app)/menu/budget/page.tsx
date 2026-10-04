import { X } from "lucide-react";
import { Card } from "@/components/ui";
import { addDays } from "@/lib/health";
import { dayLabel, spendTotals, tenge } from "@/lib/menu";
import { getSpend } from "@/lib/menu-data";
import { requireFamilySession } from "@/lib/session";
import { todayKey } from "@/lib/time";
import { deleteSpend } from "../actions";
import { MenuHeader } from "../MenuHeader";
import { SpendForm } from "./SpendForm";

export const metadata = { title: "Бюджет — Семья" };

const MONTHS = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];

export default async function BudgetPage() {
  const today = todayKey();
  // С начала прошлого месяца — для сравнения.
  const since = `${addDays(`${today.slice(0, 7)}-01`, -1).slice(0, 7)}-01`;
  const [session, rows] = await Promise.all([requireFamilySession(), getSpend(since)]);
  const t = spendTotals(rows, today);
  const month = MONTHS[Number(today.slice(5, 7)) - 1];
  const prevMonth = MONTHS[Number(t.prevMonthKey.slice(5, 7)) - 1];
  const recent = rows.filter((r) => r.spent_on >= addDays(today, -30));

  return (
    <>
      <MenuHeader profile={session.profile} subtitle="Сколько уходит на продукты" />
      <div className="flex flex-col gap-4">
        <Card className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted">Эта неделя</p>
            <p className="text-xl font-semibold tabular-nums">{tenge(t.week)}</p>
          </div>
          <div>
            <p className="text-xs text-muted first-letter:uppercase">{month}</p>
            <p className="text-xl font-semibold tabular-nums">{tenge(t.month)}</p>
          </div>
          <p className="col-span-2 text-sm text-muted">
            {t.prevMonth > 0 ? (
              <>
                За {prevMonth} — {tenge(t.prevMonth)}
                {t.month > 0 && ` · сейчас ${Math.round((t.month / t.prevMonth) * 100)}% от прошлого месяца`}
              </>
            ) : (
              "Записывайте чеки — появится сравнение с прошлым месяцем."
            )}
          </p>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Записать покупку</h2>
          <SpendForm today={today} />
        </Card>

        <Card>
          <h2 className="mb-1 font-semibold">За 30 дней</h2>
          {recent.length ? (
            <ul className="flex flex-col divide-y divide-line">
              {recent.map((r) => {
                const d = dayLabel(r.spent_on);
                return (
                  <li key={r.id} className="flex items-center gap-2 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium tabular-nums">{tenge(r.amount)}</p>
                      <p className="truncate text-xs text-muted">
                        {d.short}, {d.long}
                        {r.store ? ` · ${r.store}` : ""}
                        {r.note ? ` · ${r.note}` : ""}
                      </p>
                    </div>
                    <form action={deleteSpend}>
                      <input type="hidden" name="id" value={r.id} />
                      <button aria-label={`Удалить запись ${tenge(r.amount)}`} className="flex size-9 items-center justify-center rounded-full text-muted active:bg-card-muted">
                        <X className="size-4" aria-hidden />
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted">Пока нет записей.</p>
          )}
        </Card>
      </div>
    </>
  );
}
