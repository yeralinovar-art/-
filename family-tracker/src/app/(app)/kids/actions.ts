"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkRange, error, isDate, num, ok, str, type FormMessageState } from "@/lib/form";
import { VISIT_KINDS } from "@/lib/family-health";
import { normalizeTime } from "@/lib/meds";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { todayKey } from "@/lib/time";

export async function saveGrowth(_prev: FormMessageState, formData: FormData): Promise<FormMessageState> {
  const session = await getSession();
  if (!session) return error("Нужно войти заново");
  const childId = str(formData, "child_id");
  const date = str(formData, "measured_on") || todayKey();
  const height = num(formData, "height_cm");
  const weight = num(formData, "weight_kg");
  const problems = [
    !isDate(date) || date > todayKey() ? "Проверьте дату" : null,
    height === null && weight === null ? "Укажите рост или вес" : null,
    checkRange(height, 30, 200, "Рост"),
    checkRange(weight, 1, 120, "Вес"),
  ].filter(Boolean);
  if (problems.length) return error(problems.join(". "));

  const supabase = await createClient();
  const { error: dbError } = await supabase.from("child_growth").upsert(
    { child_id: childId, measured_on: date, height_cm: height, weight_kg: weight, note: str(formData, "note").slice(0, 200) || null },
    { onConflict: "child_id,measured_on" },
  );
  if (dbError) return error(dbError.message);
  revalidatePath("/", "layout");
  return ok("Записано");
}

export async function deleteGrowth(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("child_growth").delete().eq("id", str(formData, "id"));
  revalidatePath("/", "layout");
}

export async function saveVaccine(_prev: FormMessageState, formData: FormData): Promise<FormMessageState> {
  const session = await getSession();
  if (!session) return error("Нужно войти заново");
  const name = str(formData, "name").slice(0, 80);
  const planned = str(formData, "planned_on");
  const given = str(formData, "given_on");
  const problems = [
    !name ? "Название прививки" : null,
    !planned && !given ? "Укажите дату: когда запланирована или когда сделана" : null,
    planned && !isDate(planned) ? "Проверьте плановую дату" : null,
    given && (!isDate(given) || given > todayKey()) ? "Проверьте дату прививки" : null,
  ].filter(Boolean);
  if (problems.length) return error(problems.join(". "));

  const supabase = await createClient();
  const { error: dbError } = await supabase.from("child_vaccines").insert({
    child_id: str(formData, "child_id"),
    name,
    planned_on: planned || null,
    given_on: given || null,
    note: str(formData, "note").slice(0, 200) || null,
  });
  if (dbError) return error(dbError.message);
  revalidatePath("/", "layout");
  return ok("Добавлено");
}

/** «Сделали сегодня» / вернуть в план. */
export async function toggleVaccine(formData: FormData) {
  const supabase = await createClient();
  const given = str(formData, "given") === "1";
  await supabase
    .from("child_vaccines")
    .update({ given_on: given ? null : todayKey() })
    .eq("id", str(formData, "id"));
  revalidatePath("/", "layout");
}

export async function deleteVaccine(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("child_vaccines").delete().eq("id", str(formData, "id"));
  revalidatePath("/", "layout");
}

export async function saveVisit(_prev: FormMessageState, formData: FormData): Promise<FormMessageState> {
  const session = await getSession();
  if (!session?.family) return error("Нужно войти заново");

  const id = str(formData, "id");
  const forWhom = str(formData, "for");
  const kind = str(formData, "kind");
  const title = str(formData, "title").slice(0, 100);
  const date = str(formData, "visit_date");
  const rawTime = str(formData, "visit_time");
  const time = rawTime ? normalizeTime(rawTime) : null;
  const problems = [
    !title ? "Что за визит" : null,
    !isDate(date) ? "Укажите дату" : null,
    rawTime && !time ? "Проверьте время" : null,
    !VISIT_KINDS.some((k) => k.value === kind) ? "Выберите тип" : null,
  ].filter(Boolean);
  if (problems.length) return error(problems.join(". "));

  const row = {
    owner_id: forWhom === "me" ? session.userId : null,
    child_id: forWhom === "me" ? null : forWhom,
    kind,
    title,
    visit_date: date,
    visit_time: time,
    place: str(formData, "place").slice(0, 120) || null,
    questions: str(formData, "questions").slice(0, 2000) || null,
    result: str(formData, "result").slice(0, 4000) || null,
    done: formData.get("done") === "on",
  };

  const supabase = await createClient();
  const { error: dbError } = id
    ? await supabase.from("medical_visits").update(row).eq("id", id)
    : await supabase.from("medical_visits").insert({ ...row, family_id: session.family.id });
  if (dbError) return error(dbError.message);
  revalidatePath("/", "layout");
  // Возвращаем только на страницу внутри приложения.
  const back = str(formData, "back");
  redirect(back.startsWith("/") && !back.startsWith("//") ? back : "/visits");
}

export async function deleteVisit(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("medical_visits").delete().eq("id", str(formData, "id"));
  revalidatePath("/", "layout");
  redirect("/visits");
}
