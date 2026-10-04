import { Droplet } from "lucide-react";
import { addWater } from "@/app/(app)/food/actions";
import { Card, ProgressBar } from "@/components/ui";

export function WaterCard({ ml, goal, date }: { ml: number; goal: number; date: string }) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold">
          <Droplet className="size-5 text-sky-500" aria-hidden />
          Вода
        </h2>
        <span className="text-sm text-muted">
          {(ml / 1000).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} из{" "}
          {(goal / 1000).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} л
        </span>
      </div>
      <ProgressBar value={ml} max={goal} />
      <div className="grid grid-cols-3 gap-2">
        {[
          [-250, "−250"],
          [250, "+ стакан"],
          [500, "+ 0,5 л"],
        ].map(([delta, label]) => (
          <form key={delta} action={addWater}>
            <input type="hidden" name="date" value={date} />
            <input type="hidden" name="delta" value={delta} />
            <button
              type="submit"
              disabled={Number(delta) < 0 && ml <= 0}
              className={`min-h-11 w-full rounded-2xl text-sm font-semibold transition active:scale-95 disabled:opacity-40 ${
                Number(delta) < 0 ? "bg-card-muted text-muted" : "bg-sky-500/15 text-sky-600 dark:text-sky-400"
              }`}
            >
              {label}
            </button>
          </form>
        ))}
      </div>
    </Card>
  );
}
