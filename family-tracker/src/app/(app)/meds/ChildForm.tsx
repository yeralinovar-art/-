"use client";

import { useActionState } from "react";
import { FormMessage, SelectField, SubmitButton, TextField } from "@/components/ui";
import type { FormMessageState } from "@/lib/form";
import type { Child } from "@/lib/meds-data";
import { saveChild } from "./actions";

export function ChildForm({ child }: { child?: Child }) {
  const [state, action] = useActionState<FormMessageState, FormData>(saveChild, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      {child && <input type="hidden" name="id" value={child.id} />}
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Имя" name="name" defaultValue={child?.name} required maxLength={40} />
        <TextField label="Дата рождения" name="birth_date" type="date" defaultValue={child?.birth_date ?? ""} />
      </div>
      <SelectField
        label="Пол"
        name="sex"
        defaultValue={child?.sex ?? ""}
        options={[
          { value: "", label: "Не указан" },
          { value: "female", label: "Девочка" },
          { value: "male", label: "Мальчик" },
        ]}
      />
      <FormMessage message={state.message} />
      <SubmitButton variant="secondary">{child ? "Сохранить" : "Добавить ребёнка"}</SubmitButton>
    </form>
  );
}
