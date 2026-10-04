import Link from "next/link";
import { Trash2 } from "lucide-react";
import { DoctorNote } from "@/components/DoctorNote";
import { PageHeader } from "@/components/PageHeader";
import { Card, ProgressBar } from "@/components/ui";
import { getHealthProfile, getWeights } from "@/lib/data";
import { fmt, goalProgress, pregnancyWeightStatus, sharpWeightChange } from "@/lib/health";
import { requireFamilySession } from "@/lib/session";
import { todayKey } from "@/lib/time";
import { deleteWeight } from "./actions";
import { WeightForm } from "./WeightForm";

export const metadata = { title: "Вес — Семья" };

const shortDate = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" });

export default async function WeightPage() {
  const today = todayKey();
  const [{ profile }, health, weights] = await Promise.all([
    requireFamilySession(),
    getHealthProfile(),
    getWeights(),
  ]);
  const last = weights.at(-1) ?? null;
  const pregnant = health.is_pregnant && Boolean(health.due_date);
  const pregStatus = last ? pregnancyWeightStatus(health, last.kg, today) : null;
  const sharp = sharpWeightChange(weights, pregnant);
  const first = weights[0];

  return (
    <>
      <PageHeader title="Вес" subtitle="Видно только вам" profile={profile} />
      <div className="flex flex-col gap-4">
        <Card>
          <WeightForm today={today} lastKg={last?.kg ?? null} />
        </Card>

        {sharp !== null && (
          <DoctorNote>
            Вес заметно изменился за неделю ({sharp > 0 ? "+" : ""}
            {fmt(sharp)} кг). {pregnant ? "Стоит обсудить это с врачом." : "Если это неожиданно — обсудите с врачом."}
          </DoctorNote>
        )}

        {pregStatus && (
          <Card className="flex flex-col gap-2">
            <h2 className="font-semibold">Набор за беременность</h2>
            <p className="text-3xl font-bold">
              {pregStatus.gainKg >= 0 ? "+" : ""}
              {fmt(pregStatus.gainKg)} кг
            </p>
            <p className="text-sm text-muted">
              Коридор на {pregStatus.week}-й неделе: {fmt(pregStatus.corridor.min)}–{fmt(pregStatus.corridor.max)} кг.
              Ориентир по нижней границе: {fmt(pregStatus.targetKg)} кг.
            </p>
            {pregStatus.status === "below" && (
              <DoctorNote>Набор ниже коридора. Обсудите с врачом, всё ли в порядке.</DoctorNote>
            )}
            {pregStatus.status === "above" && (
              <DoctorNote>Набор выше коридора. Обсудите с врачом на ближайшем приёме.</DoctorNote>
            )}
          </Card>
        )}

        {!pregnant && health.goal_weight_kg && last && first && (
          <Card className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">Цель: {fmt(health.goal_weight_kg)} кг</h2>
              <span className="text-sm text-muted">
                {goalProgress(first.kg, last.kg, health.goal_weight_kg)}%
              </span>
            </div>
            <ProgressBar value={goalProgress(first.kg, last.kg, health.goal_weight_kg)} max={100} />
            <p className="text-sm text-muted">
              Старт {fmt(first.kg)} кг · сейчас {fmt(last.kg)} кг
              {health.goal_date ? ` · к ${shortDate(health.goal_date)}` : ""}
            </p>
          </Card>
        )}

        {pregnant && !pregStatus && (
          <p className="px-2 text-sm text-muted">
            Чтобы видеть коридор набора, укажите вес до беременности и рост в{" "}
            <Link href="/profile/health" className="text-accent underline">
              профиле здоровья
            </Link>
            .
          </p>
        )}

        {weights.length > 0 && (
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold">Записи</h2>
              <Link href="/progress" className="text-sm font-medium text-accent">
                График →
              </Link>
            </div>
            <ul className="flex flex-col divide-y divide-line">
              {[...weights].reverse().slice(0, 14).map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="font-medium">{fmt(w.kg)} кг</p>
                    <p className="truncate text-xs text-muted">
                      {shortDate(w.date)}
                      {w.waist_cm ? ` · талия ${fmt(w.waist_cm)}` : ""}
                      {w.hips_cm ? ` · бёдра ${fmt(w.hips_cm)}` : ""}
                      {w.chest_cm ? ` · грудь ${fmt(w.chest_cm)}` : ""}
                      {w.note ? ` · ${w.note}` : ""}
                    </p>
                  </div>
                  <form action={deleteWeight}>
                    <input type="hidden" name="id" value={w.id} />
                    <button type="submit" aria-label="Удалить запись" className="flex size-10 items-center justify-center rounded-full text-muted active:bg-card-muted">
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
