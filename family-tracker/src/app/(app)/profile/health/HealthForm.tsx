"use client";

import { useActionState, useState } from "react";
import { Card, FormMessage, NumberField, SelectField, SubmitButton, TextField, Toggle } from "@/components/ui";
import type { FormMessageState } from "@/lib/form";
import { ACTIVITY_LEVELS, type HealthProfile } from "@/lib/health";
import { saveHealthProfile } from "./actions";

const n = (v: number | null) => (v === null ? "" : String(v).replace(".", ","));

export function HealthForm({ profile, iomHint }: { profile: HealthProfile; iomHint: string | null }) {
  const [state, action] = useActionState<FormMessageState, FormData>(saveHealthProfile, {});
  const [sex, setSex] = useState(profile.sex ?? "");
  const [pregnant, setPregnant] = useState(profile.is_pregnant);
  const showPregnancy = sex === "female";

  return (
    <form action={action} className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4">
        <h2 className="font-semibold">Обо мне</h2>
        <SelectField
          label="Пол"
          name="sex"
          value={sex}
          onChange={(e) => setSex(e.target.value)}
          options={[
            { value: "", label: "Не указан" },
            { value: "female", label: "Женский" },
            { value: "male", label: "Мужской" },
          ]}
        />
        <TextField label="Дата рождения" name="birth_date" type="date" defaultValue={profile.birth_date ?? ""} />
        <NumberField label="Рост" name="height_cm" suffix="см" defaultValue={n(profile.height_cm)} />
        <SelectField
          label="Активность"
          name="activity_level"
          defaultValue={profile.activity_level}
          options={ACTIVITY_LEVELS.map((a) => ({ value: a.value, label: a.label }))}
        />
      </Card>

      {showPregnancy && (
        <Card className="flex flex-col gap-4">
          <Toggle
            label="Беременность"
            description="Видно только вам"
            name="is_pregnant"
            checked={pregnant}
            onChange={(e) => setPregnant(e.target.checked)}
          />
          {pregnant && (
            <>
              <TextField label="Предполагаемая дата родов" name="due_date" type="date" defaultValue={profile.due_date ?? ""} required />
              <NumberField
                label="Вес до беременности"
                name="pre_pregnancy_weight_kg"
                suffix="кг"
                defaultValue={n(profile.pre_pregnancy_weight_kg)}
                hint="Нужен для коридора набора веса и нормы калорий"
              />
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-muted">Набор за беременность по рекомендации врача</span>
                <div className="grid grid-cols-2 gap-3">
                  <NumberField label="от" name="gain_min_kg" suffix="кг" defaultValue={n(profile.gain_min_kg)} />
                  <NumberField label="до" name="gain_max_kg" suffix="кг" defaultValue={n(profile.gain_max_kg)} />
                </div>
                <span className="text-xs text-muted">
                  {iomHint ?? "Пусто — нормы IOM по ИМТ до беременности."} Цель на графике — нижняя граница.
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-muted">Надбавка к норме калорий по триместрам</span>
                <div className="grid grid-cols-3 gap-3">
                  <NumberField label="I" name="tri1_bonus_kcal" defaultValue={String(profile.tri1_bonus_kcal)} />
                  <NumberField label="II" name="tri2_bonus_kcal" defaultValue={String(profile.tri2_bonus_kcal)} />
                  <NumberField label="III" name="tri3_bonus_kcal" defaultValue={String(profile.tri3_bonus_kcal)} />
                </div>
                <span className="text-xs text-muted">ккал в день. Можно поменять по совету врача.</span>
              </div>
              <NumberField
                label="Кофеин в день, не больше"
                name="caffeine_limit_mg"
                suffix="мг"
                defaultValue={String(profile.caffeine_limit_mg)}
              />
            </>
          )}
        </Card>
      )}

      <Card className="flex flex-col gap-4">
        <h2 className="font-semibold">Цели</h2>
        {pregnant && showPregnancy ? (
          <p className="text-sm text-muted">
            В режиме беременности цели на снижение веса нет и дефицита калорий тоже: вместо цели —
            коридор набора веса.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Цель по весу" name="goal_weight_kg" suffix="кг" defaultValue={n(profile.goal_weight_kg)} />
            <TextField label="К дате" name="goal_date" type="date" defaultValue={profile.goal_date ?? ""} />
          </div>
        )}
        <NumberField
          label="Норма калорий вручную"
          name="kcal_target_override"
          suffix="ккал"
          defaultValue={n(profile.kcal_target_override)}
          hint="Пусто — посчитаем по формуле Миффлина — Сан Жеора"
        />
        <NumberField label="Вода в день" name="water_goal_ml" suffix="мл" defaultValue={String(profile.water_goal_ml)} />
      </Card>

      {pregnant && showPregnancy && (
        <p className="px-2 text-xs text-muted">
          Рекомендации приложения не заменяют консультацию врача.
        </p>
      )}

      <FormMessage message={state.message} />
      <SubmitButton>Сохранить</SubmitButton>
    </form>
  );
}
