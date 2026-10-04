"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { error, isDate, str, type FormMessageState } from "@/lib/form";
import { normalizeTime } from "@/lib/meds";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { todayKey } from "@/lib/time";

/** Отметить приём или снять отметку. */
export async function toggleDose(formData: FormData) {
  const session = await getSession();
  if (!session) return;
  const medicationId = str(formData, "medication_id");
  const date = str(formData, "date") || todayKey();
  const slot = normalizeTime(str(formData, "slot"));
  if (!medicationId || !isDate(date) || !slot) return;

  const supabase = await createClient();
  if (str(formData, "taken") === "1") {
    await supabase.from("medication_doses").delete().match({ medication_id: medicationId, dose_date: date, slot });
  } else {
    await supabase
      .from("medication_doses")
      .upsert(
        { medication_id: medicationId, dose_date: date, slot, taken_by: session.userId },
        { onConflict: "medication_id,dose_date,slot", ignoreDuplicates: true },
      );
  }
  revalidatePath("/", "layout");
}

export async function saveMedication(_prev: FormMessageState, formData: FormData): Promise<FormMessageState> {
  const session = await getSession();
  if (!session?.family) return error("Нужно войти заново");

  const id = str(formData, "id");
  const forWhom = str(formData, "for");
  const name = str(formData, "name").slice(0, 80);
  const dose = str(formData, "dose").slice(0, 60);
  const note = str(formData, "note").slice(0, 200);
  const endDate = str(formData, "end_date");
  const rawTimes = formData.getAll("times").map((t) => String(t));
  const times = [...new Set(rawTimes.map(normalizeTime).filter((t): t is string => Boolean(t)))].sort();
  const weekdays = [...new Set(formData.getAll("weekdays").map(Number))].filter((d) => d >= 1 && d <= 7).sort();

  const problems = [
    !name ? "Название" : null,
    rawTimes.length !== times.length ? "Проверьте время: формат 08:00" : null,
    times.length === 0 ? "Выберите время приёма" : null,
    times.length > 6 ? "Не больше 6 приёмов в день" : null,
    weekdays.length === 0 ? "Выберите хотя бы один день" : null,
    endDate && !isDate(endDate) ? "Проверьте дату окончания" : null,
  ].filter(Boolean);
  if (problems.length) return error(problems.join(". "));

  const row = {
    owner_id: forWhom === "me" ? session.userId : null,
    child_id: forWhom === "me" ? null : forWhom,
    name,
    dose: dose || null,
    note: note || null,
    times,
    weekdays: weekdays.length === 7 ? null : weekdays,
    end_date: endDate || null,
  };

  const supabase = await createClient();
  const { error: dbError } = id
    ? await supabase.from("medications").update(row).eq("id", id)
    : await supabase.from("medications").insert({ ...row, family_id: session.family.id });
  if (dbError) return error(dbError.message);

  revalidatePath("/", "layout");
  redirect("/meds");
}

export async function archiveMedication(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("medications").update({ archived: true }).eq("id", str(formData, "id"));
  revalidatePath("/", "layout");
  redirect("/meds");
}

export async function saveChild(_prev: FormMessageState, formData: FormData): Promise<FormMessageState> {
  const session = await getSession();
  if (!session?.family) return error("Нужно войти заново");
  const id = str(formData, "id");
  const name = str(formData, "name").slice(0, 40);
  const birthDate = str(formData, "birth_date");
  const sex = str(formData, "sex");
  if (!name) return error("Как зовут ребёнка?");
  if (birthDate && !isDate(birthDate)) return error("Проверьте дату рождения");

  const row = {
    name,
    birth_date: birthDate || null,
    sex: sex === "female" || sex === "male" ? sex : null,
  };
  const supabase = await createClient();
  const { error: dbError } = id
    ? await supabase.from("children").update(row).eq("id", id)
    : await supabase.from("children").insert({ ...row, family_id: session.family.id });
  if (dbError) return error(dbError.message);
  revalidatePath("/", "layout");
  return { message: { type: "info", text: "Сохранено" } };
}
