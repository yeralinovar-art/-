import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronLeft, Pill, Plus, Trash2, Undo2 } from "lucide-react";
import { Card, FamilyBadge } from "@/components/ui";
import { VisitRow } from "@/components/VisitRow";
import { childAge, growthDelta, vaccineStatus } from "@/lib/family-health";
import { fmt } from "@/lib/health";
import { getChildren, getGrowth, getVaccines, getVisits } from "@/lib/meds-data";
import { requireFamilySession } from "@/lib/session";
import { todayKey } from "@/lib/time";
import { deleteGrowth, deleteVaccine, toggleVaccine } from "../actions";
import { GrowthForm, VaccineForm } from "./Forms";
import { GrowthCharts } from "./GrowthCharts";

export const metadata = { title: "Ребёнок — Семья" };

const STATUS = {
  done: { label: "сделана", cls: "bg-accent-soft text-accent" },
  overdue: { label: "просрочена", cls: "bg-danger/10 text-danger" },
  soon: { label: "скоро", cls: "bg-family-soft text-family" },
  planned: { label: "в плане", cls: "bg-card-muted text-muted" },
};

const shortDate = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default async function ChildPage({ params }: PageProps<"/kids/[id]">) {
  const { id } = await params;
  const today = todayKey();
  const [, children, growth, vaccines, visits] = await Promise.all([
    requireFamilySession(),
    getChildren(),
    getGrowth(id),
    getVaccines(id),
    getVisits(),
  ]);
  const child = children.find((c) => c.id === id);
  if (!child) notFound();

  const last = growth.at(-1) ?? null;
  const delta = growthDelta(growth);
  const childVisits = visits.filter((v) => v.child_id === id);
  const upcoming = childVisits.filter((v) => !v.done && v.visit_date >= today).reverse();
  const past = childVisits.filter((v) => v.done || v.visit_date < today).slice(0, 5);

  return (
    <>
      <header className="flex items-center gap-2 pt-4 pb-4">
        <Link href="/tasks" aria-label="Назад" className="-ml-2 flex size-11 items-center justify-center rounded-full active:bg-card-muted">
          <ChevronLeft className="size-6" aria-hidden />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold">{child.name}</h1>
          <p className="text-sm text-muted">{child.birth_date ? childAge(child.birth_date, today) : "дата рождения не указана"}</p>
        </div>
        <span className="ml-auto">
          <FamilyBadge label="Видят оба" />
        </span>
      </header>

      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3">
          <h2 className="font-semibold">Рост и вес</h2>
          {last ? (
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-2xl bg-card-muted p-3">
                <p className="text-2xl font-bold">{last.height_cm !== null ? `${fmt(last.height_cm)} см` : "—"}</p>
                <p className="text-xs text-muted">{delta?.cm != null ? `${delta.cm >= 0 ? "+" : ""}${fmt(delta.cm)} см с прошлого` : "рост"}</p>
              </div>
              <div className="rounded-2xl bg-card-muted p-3">
                <p className="text-2xl font-bold">{last.weight_kg !== null ? `${fmt(last.weight_kg, 2)} кг` : "—"}</p>
                <p className="text-xs text-muted">{delta?.kg != null ? `${delta.kg >= 0 ? "+" : ""}${fmt(delta.kg, 2)} кг с прошлого` : "вес"}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">Запишите первый замер — например, с последнего визита к педиатру.</p>
          )}
          <GrowthCharts
            weight={growth.filter((g) => g.weight_kg !== null).map((g) => ({ date: g.measured_on, value: g.weight_kg as number }))}
            height={growth.filter((g) => g.height_cm !== null).map((g) => ({ date: g.measured_on, value: g.height_cm as number }))}
          />
          <GrowthForm childId={child.id} today={today} />
          {growth.length > 0 && (
            <details>
              <summary className="cursor-pointer text-sm font-medium text-accent">Все замеры ({growth.length})</summary>
              <ul className="mt-2 flex flex-col divide-y divide-line">
                {[...growth].reverse().map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span>
                      {shortDate(g.measured_on)}
                      <span className="text-muted">
                        {g.height_cm !== null ? ` · ${fmt(g.height_cm)} см` : ""}
                        {g.weight_kg !== null ? ` · ${fmt(g.weight_kg, 2)} кг` : ""}
                      </span>
                    </span>
                    <form action={deleteGrowth}>
                      <input type="hidden" name="id" value={g.id} />
                      <button type="submit" aria-label="Удалить замер" className="flex size-9 items-center justify-center rounded-full text-muted active:bg-card-muted">
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="font-semibold">Прививки</h2>
          {vaccines.length > 0 ? (
            <ul className="flex flex-col divide-y divide-line">
              {vaccines.map((v) => {
                const s = STATUS[vaccineStatus(v, today)];
                return (
                  <li key={v.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{v.name}</p>
                      <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                        <span className={`rounded-full px-2 py-0.5 font-medium ${s.cls}`}>{s.label}</span>
                        {v.given_on ? shortDate(v.given_on) : v.planned_on ? `на ${shortDate(v.planned_on)}` : ""}
                        {v.note ? ` · ${v.note}` : ""}
                      </p>
                    </div>
                    <form action={toggleVaccine}>
                      <input type="hidden" name="id" value={v.id} />
                      <input type="hidden" name="given" value={v.given_on ? "1" : "0"} />
                      <button
                        type="submit"
                        aria-label={v.given_on ? `Вернуть в план: ${v.name}` : `Сделали сегодня: ${v.name}`}
                        className={`flex size-10 items-center justify-center rounded-full ${v.given_on ? "text-muted" : "bg-accent-soft text-accent"}`}
                      >
                        {v.given_on ? <Undo2 className="size-4" aria-hidden /> : <Check className="size-5" aria-hidden />}
                      </button>
                    </form>
                    <form action={deleteVaccine}>
                      <input type="hidden" name="id" value={v.id} />
                      <button type="submit" aria-label={`Удалить: ${v.name}`} className="flex size-10 items-center justify-center rounded-full text-muted active:bg-card-muted">
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted">
              Внесите сделанные и запланированные прививки из прививочного сертификата — приложение подскажет, когда подходит срок.
            </p>
          )}
          <details>
            <summary className="cursor-pointer text-sm font-medium text-accent">+ Добавить прививку</summary>
            <div className="mt-3">
              <VaccineForm childId={child.id} />
            </div>
          </details>
        </Card>

        <Card className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Визиты к врачу</h2>
            <Link
              href={`/visits/new?for=${child.id}&back=/kids/${child.id}`}
              aria-label="Добавить визит"
              className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent active:scale-95"
            >
              <Plus className="size-5" aria-hidden />
            </Link>
          </div>
          {upcoming.length + past.length > 0 ? (
            <ul className="flex flex-col divide-y divide-line">
              {[...upcoming, ...past].map((v) => (
                <li key={v.id}>
                  <VisitRow visit={v} who={null} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Педиатр, анализы, другие врачи — с вопросами и итогом приёма.</p>
          )}
        </Card>

        <Link href="/meds" className="block active:opacity-90">
          <Card className="flex items-center gap-3">
            <Pill className="size-6 text-accent" aria-hidden />
            <span className="flex-1 font-medium">Витамины {child.name}</span>
            <ChevronLeft className="size-5 rotate-180 text-muted" aria-hidden />
          </Card>
        </Link>
      </div>
    </>
  );
}
