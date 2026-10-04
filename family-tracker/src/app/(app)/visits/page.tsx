import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui";
import { VisitRow } from "@/components/VisitRow";
import { getChildren, getVisits } from "@/lib/meds-data";
import { requireFamilySession } from "@/lib/session";
import { todayKey } from "@/lib/time";

export const metadata = { title: "Визиты и анализы — Семья" };

export default async function VisitsPage() {
  const today = todayKey();
  const [session, visits, children] = await Promise.all([requireFamilySession(), getVisits(), getChildren()]);
  const who = (childId: string | null) => (childId ? (children.find((c) => c.id === childId)?.name ?? "ребёнок") : null);

  const upcoming = visits
    .filter((v) => !v.done && v.visit_date >= today)
    .sort((a, b) => `${a.visit_date}${a.visit_time ?? "99"}`.localeCompare(`${b.visit_date}${b.visit_time ?? "99"}`));
  const past = visits.filter((v) => v.done || v.visit_date < today);

  return (
    <>
      <PageHeader title="Визиты и анализы" subtitle="Ваши видите только вы" profile={session.profile} />
      <div className="flex flex-col gap-4">
        <Link
          href="/visits/new"
          className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-accent font-semibold text-accent-text active:scale-[0.98]"
        >
          <Plus className="size-5" aria-hidden />
          Записать визит или анализ
        </Link>

        <Card>
          <h2 className="font-semibold">Впереди</h2>
          {upcoming.length ? (
            <ul className="flex flex-col divide-y divide-line">
              {upcoming.map((v) => (
                <li key={v.id}>
                  <VisitRow visit={v} who={who(v.child_id)} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-2 text-sm text-muted">Пока ничего не запланировано.</p>
          )}
        </Card>

        {past.length > 0 && (
          <Card>
            <h2 className="font-semibold">Прошедшие</h2>
            <ul className="flex flex-col divide-y divide-line">
              {past.map((v) => (
                <li key={v.id}>
                  <VisitRow visit={v} who={who(v.child_id)} />
                </li>
              ))}
            </ul>
          </Card>
        )}

        <p className="px-2 text-xs text-muted">
          Визиты детей видят оба родителя. Приложение хранит записи и не даёт медицинских советов.
        </p>
      </div>
    </>
  );
}
