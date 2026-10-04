"use client";

import { useActionState, useState } from "react";
import { X } from "lucide-react";
import { Card, FormMessage, SelectField, SubmitButton, TextField } from "@/components/ui";
import type { FormMessageState } from "@/lib/form";
import { WEEKDAYS, type Medication } from "@/lib/meds";
import { saveMedication } from "./actions";

const PRESETS = [
  { label: "Утро", time: "08:00" },
  { label: "День", time: "13:00" },
  { label: "Вечер", time: "20:00" },
  { label: "На ночь", time: "22:00" },
];

export function MedForm({
  med,
  people,
  defaultFor,
}: {
  med?: Medication;
  people: { value: string; label: string }[];
  defaultFor: string;
}) {
  const [state, action] = useActionState<FormMessageState, FormData>(saveMedication, {});
  const [times, setTimes] = useState<string[]>(med?.times ?? ["08:00"]);
  const [custom, setCustom] = useState("");
  const [days, setDays] = useState<number[]>(med?.weekdays ?? [1, 2, 3, 4, 5, 6, 7]);

  const toggleTime = (t: string) =>
    setTimes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t].sort()));
  const toggleDay = (d: number) =>
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));
  const addCustom = () => {
    const m = custom.trim().match(/^(\d{1,2})[:.](\d{2})$/);
    if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return;
    const t = `${m[1].padStart(2, "0")}:${m[2]}`;
    if (!times.includes(t)) setTimes([...times, t].sort());
    setCustom("");
  };

  return (
    <form action={action} className="flex flex-col gap-4">
      {med && <input type="hidden" name="id" value={med.id} />}
      {times.map((t) => (
        <input key={t} type="hidden" name="times" value={t} />
      ))}
      {days.map((d) => (
        <input key={d} type="hidden" name="weekdays" value={d} />
      ))}

      <Card className="flex flex-col gap-4">
        <SelectField
          label="Для кого"
          name="for"
          defaultValue={med ? (med.child_id ?? "me") : defaultFor}
          options={people}
        />
        <TextField label="Название" name="name" defaultValue={med?.name} placeholder="Витамин D" required maxLength={80} />
        <TextField label="Доза" name="dose" defaultValue={med?.dose ?? ""} placeholder="1 таблетка, 2000 МЕ" maxLength={60} />
      </Card>

      <Card className="flex flex-col gap-3">
        <span className="text-sm font-medium text-muted">Время приёма</span>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.time}
              type="button"
              onClick={() => toggleTime(p.time)}
              aria-pressed={times.includes(p.time)}
              className={`min-h-10 rounded-full px-3.5 text-sm font-medium transition ${
                times.includes(p.time) ? "bg-accent text-accent-text" : "bg-card-muted"
              }`}
            >
              {p.label} {p.time}
            </button>
          ))}
        </div>
        {times.filter((t) => !PRESETS.some((p) => p.time === t)).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {times
              .filter((t) => !PRESETS.some((p) => p.time === t))
              .map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTime(t)}
                  aria-label={`Убрать ${t}`}
                  className="flex min-h-10 items-center gap-1 rounded-full bg-accent px-3.5 text-sm font-medium text-accent-text"
                >
                  {t} <X className="size-4" aria-hidden />
                </button>
              ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="time"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            aria-label="Своё время"
            className="min-h-11 flex-1 rounded-2xl border border-line bg-card px-4"
          />
          <button type="button" onClick={addCustom} className="min-h-11 rounded-2xl bg-card-muted px-4 text-sm font-semibold">
            Добавить время
          </button>
        </div>

        <span className="mt-2 text-sm font-medium text-muted">Дни</span>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => toggleDay(d.value)}
              aria-pressed={days.includes(d.value)}
              className={`min-h-10 rounded-xl text-sm font-medium transition ${
                days.includes(d.value) ? "bg-accent text-accent-text" : "bg-card-muted text-muted"
              }`}
            >
              {d.short}
            </button>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <TextField label="Заметка" name="note" defaultValue={med?.note ?? ""} placeholder="Натощак, запивать водой" maxLength={200} />
        <TextField label="Принимать до (необязательно)" name="end_date" type="date" defaultValue={med?.end_date ?? ""} />
      </Card>

      <FormMessage message={state.message} />
      <SubmitButton>{med ? "Сохранить" : "Добавить"}</SubmitButton>
    </form>
  );
}
