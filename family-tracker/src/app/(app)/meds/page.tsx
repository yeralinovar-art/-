import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { DoseList } from "@/components/DoseList";
import { PageHeader } from "@/components/PageHeader";
import { Card, FamilyBadge } from "@/components/ui";
import { toDoseItems } from "@/lib/dose-items";
import { scheduleLabel } from "@/lib/meds";
import { getChildren, getDoses, getMedications } from "@/lib/meds-data";
import { requireFamilySession } from "@/lib/session";
import { todayKey } from "@/lib/time";
import { ChildForm } from "./ChildForm";

export const metadata = { title: "Витамины — Семья" };

function ageLabel(birth: string | null) {
  if (!birth) return null;
  const [by, bm, bd] = birth.split("-").map(Number);
  const [ty, tm, td] = todayKey().split("-").map(Number);
  let months = (ty - by) * 12 + (tm - bm) - (td < bd ? 1 : 0);
  if (months < 0) return null;
  const years = Math.floor(months / 12);
  months %= 12;
  const y = years === 0 ? "" : `${years} ${years === 1 ? "год" : years < 5 ? "года" : "лет"}`;
  const m = months === 0 ? "" : `${months} мес.`;
  return [y, m].filter(Boolean).join(" ") || "меньше месяца";
}

export default async function MedsPage() {
  const today = todayKey();
  const [session, meds, doses, children] = await Promise.all([
    requireFamilySession(),
    getMedications(),
    getDoses(today),
    getChildren(),
  ]);
  const items = toDoseItems(meds, doses, today, children, session);
  const done = items.filter((i) => i.takenLabel).length;

  const groups = [
    { key: "me", title: "Мои", shared: false, meds: meds.filter((m) => m.owner_id === session.userId) },
    ...children.map((c) => ({ key: c.id, title: c.name, shared: true, meds: meds.filter((m) => m.child_id === c.id) })),
  ];

  return (
    <>
      <PageHeader title="Витамины" subtitle="По расписанию врача" profile={session.profile} />
      <div className="flex flex-col gap-4">
        <Card>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-semibold">Сегодня</h2>
            {items.length > 0 && (
              <span className="text-sm text-muted">
                {done} из {items.length}
              </span>
            )}
          </div>
          {items.length > 0 ? (
            <DoseList items={items} date={today} />
          ) : (
            <p className="py-2 text-sm text-muted">На сегодня приёмов нет.</p>
          )}
        </Card>

        {groups.map((g) => (
          <Card key={g.key} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-semibold">
                {g.title}
                {g.shared && <FamilyBadge label="Видят оба" />}
              </h2>
              <Link
                href={`/meds/new?for=${g.key}`}
                aria-label={`Добавить: ${g.title}`}
                className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent active:scale-95"
              >
                <Plus className="size-5" aria-hidden />
              </Link>
            </div>
            {g.meds.length > 0 ? (
              <ul className="flex flex-col divide-y divide-line">
                {g.meds.map((m) => (
                  <li key={m.id}>
                    <Link href={`/meds/${m.id}`} className="flex items-center justify-between gap-3 py-3">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {m.name}
                          {m.dose ? <span className="font-normal text-muted"> · {m.dose}</span> : null}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {scheduleLabel(m)}
                          {m.note ? ` · ${m.note}` : ""}
                        </span>
                      </span>
                      <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Пока ничего. Нажмите «+», чтобы добавить.</p>
            )}
          </Card>
        ))}

        <Card className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 font-semibold">
            Дети <FamilyBadge label="Общее" />
          </h2>
          {children.map((c) => (
            <details key={c.id} className="rounded-2xl bg-card-muted p-3">
              <summary className="cursor-pointer font-medium">
                {c.name}
                {ageLabel(c.birth_date) && <span className="font-normal text-muted"> · {ageLabel(c.birth_date)}</span>}
              </summary>
              <div className="mt-3">
                <ChildForm child={c} />
              </div>
            </details>
          ))}
          <details className="rounded-2xl bg-card-muted p-3">
            <summary className="cursor-pointer font-medium text-accent">+ Добавить ребёнка</summary>
            <div className="mt-3">
              <ChildForm />
            </div>
          </details>
        </Card>

        <p className="px-2 text-xs text-muted">
          Схемы приёма — по назначению врача. Приложение только напоминает и отмечает.
        </p>
      </div>
    </>
  );
}
