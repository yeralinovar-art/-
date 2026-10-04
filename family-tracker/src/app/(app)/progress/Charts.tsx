"use client";

import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Одна серия — один оттенок (--chart-1). Нормы и коридор — нейтральные, подписаны текстом.
const C = {
  series: "var(--chart-1)",
  band: "var(--chart-band)",
  grid: "var(--chart-grid)",
  ref: "var(--chart-ref)",
  text: "var(--muted)",
};

const DAY = 86_400_000;
const ts = (d: string) => Date.parse(`${d}T12:00:00Z`);
const dayLabel = (t: number) =>
  new Date(t).toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" });
const kg = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 1 });

type Range = "week" | "month" | "all";
const RANGES: [Range, string, number | null][] = [
  ["week", "Неделя", 7],
  ["month", "Месяц", 31],
  ["all", "Всё время", null],
];

function RangeTabs({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-2xl bg-card-muted p-1" role="tablist" aria-label="Период">
      {RANGES.map(([r, label]) => (
        <button
          key={r}
          type="button"
          role="tab"
          aria-selected={value === r}
          onClick={() => onChange(r)}
          className={`min-h-10 rounded-xl text-sm font-medium ${value === r ? "bg-card shadow-sm" : "text-muted"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function TooltipBox({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-xl border border-line bg-card px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium">{title}</p>
      {rows.map(([k, v]) => (
        <p key={k} className="text-muted">
          {k}: <span className="font-semibold text-text">{v}</span>
        </p>
      ))}
    </div>
  );
}

export type WeightChartPoint = { date: string; kg: number; avg: number };
export type CorridorPoint = { date: string; min: number; max: number; target: number };

export function WeightChart({
  points,
  corridor,
  goalKg,
  today,
}: {
  points: WeightChartPoint[];
  corridor: CorridorPoint[] | null;
  goalKg: number | null;
  today: string;
}) {
  const [range, setRange] = useState<Range>("month");
  const days = RANGES.find(([r]) => r === range)?.[2] ?? null;

  const data = useMemo(() => {
    const from = days ? ts(today) - (days - 1) * DAY : -Infinity;
    const rows = new Map<number, Record<string, number | [number, number] | undefined>>();
    for (const p of points) {
      const t = ts(p.date);
      if (t >= from) rows.set(t, { t, kg: p.kg, avg: p.avg });
    }
    const firstT = rows.size ? Math.min(...rows.keys()) : ts(today);
    for (const c of corridor ?? []) {
      const t = ts(c.date);
      if (t < Math.max(from, firstT - 7 * DAY) || t > ts(today) + 7 * DAY) continue;
      rows.set(t, { ...(rows.get(t) ?? { t }), band: [c.min, c.max], target: c.target });
    }
    return [...rows.values()].sort((a, b) => (a.t as number) - (b.t as number));
  }, [points, corridor, days, today]);

  const hasWeights = data.some((d) => d.kg !== undefined);
  const values = data.flatMap((d) => [d.kg, ...(Array.isArray(d.band) ? d.band : [])]).filter((v): v is number => typeof v === "number");
  if (goalKg) values.push(goalKg);
  // Ровный шаг делений: 1 кг при узком диапазоне, иначе 2 или 5 кг.
  const span = Math.max(...values) - Math.min(...values) + 2;
  const step = span <= 6 ? 1 : span <= 14 ? 2 : 5;
  const lo = Math.floor((Math.min(...values) - 1) / step) * step;
  const hi = Math.ceil((Math.max(...values) + 1) / step) * step;
  const yTicks = Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);

  return (
    <div className="flex flex-col gap-3">
      <RangeTabs value={range} onChange={setRange} />
      {hasWeights ? (
        <>
          <div className="h-64 w-full" role="img" aria-label="График веса">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis
                  dataKey="t"
                  type="number"
                  scale="time"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={dayLabel}
                  tick={{ fill: C.text, fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: C.grid }}
                  minTickGap={24}
                />
                <YAxis
                  domain={[lo, hi]}
                  ticks={yTicks}
                  tickFormatter={(v) => kg(v)}
                  tick={{ fill: C.text, fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  allowDecimals={false}
                />
                {corridor && <Area dataKey="band" stroke="none" fill={C.band} isAnimationActive={false} connectNulls />}
                {corridor && (
                  <Line dataKey="target" stroke={C.ref} strokeWidth={1.5} strokeDasharray="4 4" dot={false} isAnimationActive={false} connectNulls />
                )}
                {goalKg && !corridor && (
                  <ReferenceLine
                    y={goalKg}
                    stroke={C.ref}
                    strokeDasharray="4 4"
                    label={{ value: `цель ${kg(goalKg)}`, position: "insideTopRight", fill: C.text, fontSize: 12 }}
                  />
                )}
                <Line
                  dataKey="kg"
                  stroke="none"
                  dot={{ r: 4, fill: C.series, fillOpacity: 0.35, stroke: "var(--card)", strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: C.series, stroke: "var(--card)", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
                <Line
                  dataKey="avg"
                  stroke={C.series}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Tooltip
                  cursor={{ stroke: C.ref, strokeWidth: 1 }}
                  content={({ active, payload }) => {
                    const row = payload?.[0]?.payload as Record<string, number | [number, number]> | undefined;
                    if (!active || !row) return null;
                    const rows: [string, string][] = [];
                    if (typeof row.kg === "number") rows.push(["Вес", `${kg(row.kg)} кг`]);
                    if (typeof row.avg === "number") rows.push(["Среднее 7 дн.", `${kg(row.avg)} кг`]);
                    if (Array.isArray(row.band)) rows.push(["Коридор", `${kg(row.band[0])}–${kg(row.band[1])} кг`]);
                    return <TooltipBox title={dayLabel(row.t as number)} rows={rows} />;
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[var(--chart-1)] opacity-40" />
              взвешивания
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded bg-[var(--chart-1)]" />
              среднее за 7 дней
            </li>
            {corridor && (
              <>
                <li className="flex items-center gap-1.5">
                  <span className="h-2.5 w-4 rounded-sm bg-[var(--chart-band)] ring-1 ring-line" />
                  коридор набора
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-4 border-t-2 border-dashed border-[var(--chart-ref)]" />
                  ориентир (нижняя граница)
                </li>
              </>
            )}
          </ul>
        </>
      ) : (
        <p className="py-8 text-center text-sm text-muted">За этот период взвешиваний нет.</p>
      )}
    </div>
  );
}

export function KcalChart({ days, target }: { days: { date: string; kcal: number }[]; target: number | null }) {
  const data = days.map((d) => ({ t: ts(d.date), kcal: d.kcal }));
  const max = Math.max(target ?? 0, ...data.map((d) => d.kcal));
  const top = Math.ceil((max * 1.1) / 500) * 500;
  const kStep = top > 3000 ? 1000 : 500;
  const kTicks = Array.from({ length: Math.floor(top / kStep) + 1 }, (_, i) => i * kStep);
  const avg = data.length ? Math.round(data.reduce((s, d) => s + d.kcal, 0) / data.length) : 0;

  if (!data.length) return <p className="py-8 text-center text-sm text-muted">Пока нет записей в дневнике.</p>;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted">
        В среднем <span className="font-semibold text-text">{avg.toLocaleString("ru-RU")} ккал</span> в день
        {target ? ` при норме ${target.toLocaleString("ru-RU")}` : ""}
      </p>
      <div className="h-56 w-full" role="img" aria-label="Калории по дням">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis
              dataKey="t"
              tickFormatter={dayLabel}
              tick={{ fill: C.text, fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: C.grid }}
              minTickGap={16}
            />
            <YAxis
              domain={[0, top]}
              ticks={kTicks}
              tickFormatter={(v) => v.toLocaleString("ru-RU")}
              tick={{ fill: C.text, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            {target && (
              <ReferenceLine
                y={target}
                stroke={C.ref}
                strokeDasharray="4 4"
                label={{ value: "норма", position: "insideTopRight", fill: C.text, fontSize: 12 }}
              />
            )}
            <Bar dataKey="kcal" fill={C.series} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
            <Tooltip
              cursor={{ fill: C.band }}
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as { t: number; kcal: number } | undefined;
                if (!active || !row) return null;
                return <TooltipBox title={dayLabel(row.t)} rows={[["Съедено", `${row.kcal.toLocaleString("ru-RU")} ккал`]]} />;
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Активность: минуты тренировок по дням за 2 недели (одна серия). */
export function ActivityChart({ days }: { days: { date: string; minutes: number; kcal: number }[] }) {
  const data = days.map((d) => ({ t: ts(d.date), minutes: d.minutes, kcal: d.kcal }));
  const total = data.reduce((s, d) => s + d.minutes, 0);
  if (!total) return <p className="py-8 text-center text-sm text-muted">Пока нет тренировок за две недели.</p>;
  const max = Math.max(...data.map((d) => d.minutes));
  const step = max > 120 ? 60 : max > 60 ? 30 : 15;
  const top = Math.ceil((max * 1.1) / step) * step;
  const ticks = Array.from({ length: Math.floor(top / step) + 1 }, (_, i) => i * step);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted">
        Всего <span className="font-semibold text-text">{total.toLocaleString("ru-RU")} мин</span> за 2 недели
      </p>
      <div className="h-48 w-full" role="img" aria-label="Минуты тренировок по дням">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="t" tickFormatter={dayLabel} tick={{ fill: C.text, fontSize: 12 }} tickLine={false} axisLine={{ stroke: C.grid }} minTickGap={16} />
            <YAxis domain={[0, top]} ticks={ticks} tick={{ fill: C.text, fontSize: 12 }} tickLine={false} axisLine={false} width={40} />
            <Bar dataKey="minutes" fill={C.series} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
            <Tooltip
              cursor={{ fill: C.band }}
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as { t: number; minutes: number; kcal: number } | undefined;
                if (!active || !row) return null;
                return (
                  <TooltipBox
                    title={dayLabel(row.t)}
                    rows={[
                      ["Тренировки", `${row.minutes} мин`],
                      ["Сожжено", `${row.kcal.toLocaleString("ru-RU")} ккал`],
                    ]}
                  />
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
