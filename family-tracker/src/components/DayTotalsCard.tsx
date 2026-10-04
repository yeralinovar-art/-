import Link from "next/link";
import { Card, ProgressBar } from "@/components/ui";
import type { DayTotals } from "@/lib/data";
import { macroTargets, type KcalTarget } from "@/lib/health";

const r0 = (n: number) => Math.round(n).toLocaleString("ru-RU");

const BASIS: Record<KcalTarget["basis"], string> = {
  manual: "норма задана вручную",
  pregnancy: "норма с надбавкой на беременность, без дефицита",
  loss: "норма с умеренным дефицитом для снижения веса",
  gain: "норма с профицитом для набора веса",
  maintain: "норма для поддержания веса",
};

/** Итоги дня: съедено / норма / осталось и БЖУ. */
export function DayTotalsCard({ totals, target, href }: { totals: DayTotals; target: KcalTarget | null; href?: string }) {
  const left = target ? target.kcal - totals.kcal : null;
  const macros = target ? macroTargets(target.kcal) : null;

  const body = (
    <Card className="flex flex-col gap-3">
      <div className="grid grid-cols-3 text-center">
        <div>
          <p className="text-2xl font-bold">{r0(totals.kcal)}</p>
          <p className="text-xs text-muted">съедено</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{target ? r0(target.kcal) : "—"}</p>
          <p className="text-xs text-muted">норма</p>
        </div>
        <div>
          <p className={`text-2xl font-bold ${left !== null && left < 0 ? "text-danger" : "text-accent"}`}>
            {left === null ? "—" : r0(Math.abs(left))}
          </p>
          <p className="text-xs text-muted">{left !== null && left < 0 ? "сверх нормы" : "осталось"}</p>
        </div>
      </div>
      {target && <ProgressBar value={totals.kcal} max={target.kcal} tone={left !== null && left < 0 ? "danger" : "accent"} />}
      <div className="grid grid-cols-3 gap-3 text-sm">
        {(
          [
            ["Белки", totals.protein, macros?.protein],
            ["Жиры", totals.fat, macros?.fat],
            ["Углеводы", totals.carbs, macros?.carbs],
          ] as const
        ).map(([label, value, goal]) => (
          <div key={label} className="flex flex-col gap-1">
            <span className="text-muted">{label}</span>
            <span className="font-semibold">
              {r0(value)}
              {goal ? <span className="font-normal text-muted"> / {goal} г</span> : " г"}
            </span>
            {goal ? <ProgressBar value={value} max={goal} tone="family" /> : null}
          </div>
        ))}
      </div>
      {target ? (
        <p className="text-xs text-muted">{BASIS[target.basis]}</p>
      ) : (
        <p className="text-sm text-muted">
          Чтобы посчитать норму, заполните{" "}
          <Link href="/profile/health" className="text-accent underline">
            профиль здоровья
          </Link>{" "}
          и запишите вес.
        </p>
      )}
    </Card>
  );

  return href ? (
    <Link href={href} className="block active:opacity-90">
      {body}
    </Link>
  ) : (
    body
  );
}
