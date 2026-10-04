"use client";

import { useActionState, useState } from "react";
import { Card, FormMessage, SelectField, SubmitButton, TextField, Toggle } from "@/components/ui";
import { VISIT_KINDS, type Visit, type VisitKind } from "@/lib/family-health";
import type { FormMessageState } from "@/lib/form";
import { saveVisit } from "../kids/actions";

const SUGGESTIONS: Record<VisitKind, string[]> = {
  doctor: ["Гинеколог", "Терапевт", "Эндокринолог", "Педиатр", "Стоматолог", "ЛОР"],
  ultrasound: ["УЗИ-скрининг", "УЗИ плода", "Допплерометрия", "КТГ", "УЗИ щитовидной железы"],
  tests: ["Общий анализ крови", "Общий анализ мочи", "ТТГ и Т4 свободный", "Ферритин", "Глюкозотолерантный тест", "Коагулограмма"],
  other: ["Справка", "Массаж", "Физиотерапия"],
};

const textareaCls =
  "min-h-24 rounded-2xl border border-line bg-card px-4 py-3 outline-none transition focus:border-accent";

export function VisitForm({
  visit,
  people,
  defaultFor,
  back,
}: {
  visit?: Visit;
  people: { value: string; label: string }[];
  defaultFor: string;
  back: string;
}) {
  const [state, action] = useActionState<FormMessageState, FormData>(saveVisit, {});
  const [kind, setKind] = useState<VisitKind>(visit?.kind ?? "doctor");

  return (
    <form action={action} className="flex flex-col gap-4">
      {visit && <input type="hidden" name="id" value={visit.id} />}
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="back" value={back} />

      <Card className="flex flex-col gap-4">
        <SelectField label="Для кого" name="for" defaultValue={visit ? (visit.child_id ?? "me") : defaultFor} options={people} />
        <div className="grid grid-cols-4 gap-1 rounded-2xl bg-card-muted p-1">
          {VISIT_KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => setKind(k.value)}
              aria-pressed={kind === k.value}
              className={`min-h-10 rounded-xl text-xs font-medium transition ${kind === k.value ? "bg-card shadow-sm" : "text-muted"}`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <TextField
          label="Что"
          name="title"
          list={`visit-${kind}`}
          defaultValue={visit?.title}
          placeholder={SUGGESTIONS[kind][0]}
          required
          maxLength={100}
        />
        <datalist id={`visit-${kind}`}>
          {SUGGESTIONS[kind].map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <TextField label="Дата" name="visit_date" type="date" defaultValue={visit?.visit_date} required />
          <TextField label="Время" name="visit_time" type="time" defaultValue={visit?.visit_time ?? ""} />
        </div>
        <TextField label="Где" name="place" defaultValue={visit?.place ?? ""} placeholder="Поликлиника, кабинет" maxLength={120} />
      </Card>

      <Card className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted">Вопросы врачу</span>
          <textarea
            name="questions"
            defaultValue={visit?.questions ?? ""}
            maxLength={2000}
            placeholder={"Записывайте заранее, чтобы ничего не забыть:\n— интервал между Эутироксом и Ранфероном?"}
            className={textareaCls}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted">Итог, назначения, результаты</span>
          <textarea
            name="result"
            defaultValue={visit?.result ?? ""}
            maxLength={4000}
            placeholder="Что сказал врач, цифры анализов, следующий визит"
            className={textareaCls}
          />
        </label>
        <Toggle label="Уже прошёл" name="done" defaultChecked={visit?.done ?? false} />
      </Card>

      <FormMessage message={state.message} />
      <SubmitButton>{visit ? "Сохранить" : "Добавить"}</SubmitButton>
    </form>
  );
}
