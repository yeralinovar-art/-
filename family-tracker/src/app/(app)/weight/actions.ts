"use server";

import { revalidatePath } from "next/cache";
import { checkRange, error, isDate, num, ok, str, type FormMessageState } from "@/lib/form";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { todayKey } from "@/lib/time";

export async function saveWeight(_prev: FormMessageState, formData: FormData): Promise<FormMessageState> {
  const session = await getSession();
  if (!session) return error("Нужно войти заново");

  const date = str(formData, "entry_date") || todayKey();
  const kg = num(formData, "weight_kg");
  const waist = num(formData, "waist_cm");
  const hips = num(formData, "hips_cm");
  const chest = num(formData, "chest_cm");
  const note = str(formData, "note").slice(0, 300);

  const problems = [
    !isDate(date) ? "Проверьте дату" : null,
    date > todayKey() ? "Дата не может быть в будущем" : null,
    kg === null ? "Введите вес" : checkRange(kg, 20, 350, "Вес"),
    checkRange(waist, 30, 250, "Талия"),
    checkRange(hips, 30, 250, "Бёдра"),
    checkRange(chest, 30, 250, "Грудь"),
  ].filter(Boolean);
  if (problems.length) return error(problems.join(". "));

  const supabase = await createClient();
  // Одна запись в день: повторный ввод за ту же дату обновляет её.
  const { error: dbError } = await supabase.from("weight_entries").upsert(
    {
      user_id: session.userId,
      entry_date: date,
      weight_kg: kg,
      waist_cm: waist,
      hips_cm: hips,
      chest_cm: chest,
      note: note || null,
    },
    { onConflict: "user_id,entry_date" },
  );
  if (dbError) return error(dbError.message);

  revalidatePath("/", "layout");
  return ok(`Записано: ${String(kg).replace(".", ",")} кг`);
}

export async function deleteWeight(formData: FormData) {
  const id = str(formData, "id");
  const supabase = await createClient();
  await supabase.from("weight_entries").delete().eq("id", id);
  revalidatePath("/", "layout");
}
