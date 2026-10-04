"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Одна серия на график, без второй оси: вес и рост — отдельно (цвет — проверенный --chart-1).
const ts = (d: string) => Date.parse(`${d}T12:00:00Z`);
const label = (t: number) => new Date(t).toLocaleDateString("ru-RU", { month: "short", year: "2-digit", timeZone: "UTC" });

function MiniChart({ points, unit, title }: { points: { date: string; value: number }[]; unit: string; title: string }) {
  if (points.length < 2) return null;
  const data = points.map((p) => ({ t: ts(p.date), v: p.value }));
  const values = data.map((d) => d.v);
  const pad = Math.max(0.5, (Math.max(...values) - Math.min(...values)) * 0.15);
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-muted">{title}</p>
      <div className="h-36 w-full" role="img" aria-label={`График: ${title}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={label}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--chart-grid)" }}
              minTickGap={24}
            />
            <YAxis
              domain={[Math.floor(Math.min(...values) - pad), Math.ceil(Math.max(...values) + pad)]}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={40}
              allowDecimals={false}
            />
            <Line
              dataKey="v"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={{ r: 4, fill: "var(--chart-1)", stroke: "var(--card)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Tooltip
              cursor={{ stroke: "var(--chart-ref)", strokeWidth: 1 }}
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as { t: number; v: number } | undefined;
                if (!active || !row) return null;
                return (
                  <div className="rounded-xl border border-line bg-card px-3 py-2 text-sm shadow-md">
                    <p className="text-muted">
                      {new Date(row.t).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
                    </p>
                    <p className="font-semibold">
                      {row.v.toLocaleString("ru-RU")} {unit}
                    </p>
                  </div>
                );
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function GrowthCharts({
  weight,
  height,
}: {
  weight: { date: string; value: number }[];
  height: { date: string; value: number }[];
}) {
  return (
    <div className="grid gap-3">
      <MiniChart points={weight} unit="кг" title="Вес, кг" />
      <MiniChart points={height} unit="см" title="Рост, см" />
    </div>
  );
}
