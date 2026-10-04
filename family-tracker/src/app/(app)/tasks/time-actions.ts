"use server";

import { revalidatePath } from "next/cache";
import { checkRange, error, isDate, num, ok, str, type FormMessageState } from "@/lib/form";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { localDate, nextColorSlot, PROJECT_KINDS } from "@/lib/timetrack";
import { todayKey } from "@/lib/time";

const DAY_MS = 86_400_000;

function refresh() {
  revalidatePath("/", "layout");
}

/** Конец записи: сейчас, но не дальше суток от начала (ограничение в базе). */
function endFor(startedAt: string): string {
  return new Date(Math.min(Date.now(), Date.parse(startedAt) + DAY_MS)).toISOString();
}

// ---------------------------------------------------------------------------
// Проекты
// ---------------------------------------------------------------------------

export async function saveProject(_prev: FormMessageState, formData: FormData): Promise<FormMessageState> {
  const session = await getSession();
  if (!session) return error("Нужно войти заново");
  const name = str(formData, "name").slice(0, 60);
  const kind = str(formData, "kind");
  if (!name) return error("Назовите проект");
  if (!PROJECT_KINDS.some((k) => k.value === kind)) return error("Работа или хобби?");
  const supabase = await createClient();
  const { data: used } = await supabase.from("projects").select("color_slot").eq("archived", false);
  const { error: dbError } = await supabase
    .from("projects")
    .insert({ name, kind, color_slot: nextColorSlot((used ?? []).map((u) => u.color_slot)) });
  if (dbError) return error(dbError.message);
  refresh();
  return ok("Проект добавлен");
}

export async function archiveProject(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("projects").update({ archived: true }).eq("id", str(formData, "id"));
  refresh();
}

// ---------------------------------------------------------------------------
// Таймер и записи времени
// ---------------------------------------------------------------------------

async function stopRunning(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: running } = await supabase.from("time_entries").select("id, started_at").is("ended_at", null).maybeSingle();
  if (!running) return;
  const end = endFor(running.started_at);
  if (Date.parse(end) - Date.parse(running.started_at) < 60_000) {
    await supabase.from("time_entries").delete().eq("id", running.id);
  } else {
    await supabase.from("time_entries").update({ ended_at: end }).eq("id", running.id);
  }
}

/** Старт по проекту; если что-то уже шло — оно останавливается. */
export async function startTimer(formData: FormData) {
  const session = await getSession();
  if (!session) return;
  const supabase = await createClient();
  await stopRunning(supabase);
  await supabase.from("time_entries").insert({ project_id: str(formData, "project_id"), started_at: new Date().toISOString() });
  refresh();
}

export async function stopTimer() {
  const session = await getSession();
  if (!session) return;
  const supabase = await createClient();
  await stopRunning(supabase);
  refresh();
}

export async function addTimeManual(_prev: FormMessageState, formData: FormData): Promise<FormMessageState> {
  const session = await getSession();
  if (!session) return error("Нужно войти заново");
  const projectId = str(formData, "project_id");
  const date = str(formData, "date") || todayKey();
  const hours = num(formData, "hours") ?? 0;
  const minutes = num(formData, "minutes") ?? 0;
  const total = Math.round((Number.isNaN(hours) ? NaN : hours) * 60 + (Number.isNaN(minutes) ? NaN : minutes));
  const problems = [
    !projectId ? "Выберите проект" : null,
    !isDate(date) || date > todayKey() ? "Проверьте дату" : null,
    Number.isNaN(total) ? "Время: введите число" : total < 1 || total > 900 ? "Время: от 1 минуты до 15 часов" : null,
  ].filter(Boolean);
  if (problems.length) return error(problems.join(". "));
  // Ручная запись ставится на 09:00 выбранного дня по Алматы.
  const start = Date.parse(`${date}T09:00:00+05:00`);
  const supabase = await createClient();
  const { error: dbError } = await supabase.from("time_entries").insert({
    project_id: projectId,
    started_at: new Date(start).toISOString(),
    ended_at: new Date(start + total * 60_000).toISOString(),
    note: str(formData, "note").slice(0, 200) || null,
  });
  if (dbError) return error(dbError.message);
  refresh();
  return ok("Записано");
}

export async function deleteTimeEntry(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("time_entries").delete().eq("id", str(formData, "id"));
  refresh();
}

// ---------------------------------------------------------------------------
// Чтение
// ---------------------------------------------------------------------------

export async function startReading(formData: FormData) {
  const session = await getSession();
  if (!session) return;
  const supabase = await createClient();
  await finishReading(supabase, null);
  const now = new Date().toISOString();
  await supabase.from("reading_sessions").insert({ book_id: str(formData, "book_id") || null, started_at: now, read_on: localDate(now) });
  refresh();
}

async function finishReading(supabase: Awaited<ReturnType<typeof createClient>>, page: number | null) {
  const { data: running } = await supabase
    .from("reading_sessions")
    .select("id, book_id, started_at")
    .is("minutes", null)
    .maybeSingle();
  if (!running?.started_at) return;
  const minutes = Math.min(600, Math.round((Date.now() - Date.parse(running.started_at)) / 60000));
  if (minutes < 1) {
    await supabase.from("reading_sessions").delete().eq("id", running.id);
  } else {
    await supabase.from("reading_sessions").update({ minutes }).eq("id", running.id);
  }
  if (running.book_id && page !== null && Number.isFinite(page) && page >= 0) {
    await updatePage(supabase, running.book_id, page);
  }
}

async function updatePage(supabase: Awaited<ReturnType<typeof createClient>>, bookId: string, page: number) {
  const { data: book } = await supabase.from("books").select("total_pages").eq("id", bookId).maybeSingle();
  if (!book) return;
  const total = book.total_pages as number | null;
  const current = Math.round(total ? Math.min(page, total) : page);
  const done = total !== null && current >= total;
  await supabase
    .from("books")
    .update({ current_page: current, ...(done ? { status: "done", finished_on: todayKey() } : {}) })
    .eq("id", bookId);
}

export async function stopReading(formData: FormData) {
  const session = await getSession();
  if (!session) return;
  const page = num(formData, "page");
  const supabase = await createClient();
  await finishReading(supabase, page === null || Number.isNaN(page) ? null : page);
  refresh();
}

export async function addReadingManual(_prev: FormMessageState, formData: FormData): Promise<FormMessageState> {
  const session = await getSession();
  if (!session) return error("Нужно войти заново");
  const minutes = num(formData, "minutes");
  const date = str(formData, "date") || todayKey();
  const problems = [
    minutes === null ? "Сколько минут" : checkRange(minutes, 1, 600, "Минуты"),
    !isDate(date) || date > todayKey() ? "Проверьте дату" : null,
  ].filter(Boolean);
  if (problems.length) return error(problems.join(". "));
  const supabase = await createClient();
  const bookId = str(formData, "book_id") || null;
  const { error: dbError } = await supabase
    .from("reading_sessions")
    .insert({ book_id: bookId, read_on: date, minutes: Math.round(minutes as number) });
  if (dbError) return error(dbError.message);
  const page = num(formData, "page");
  if (bookId && page !== null && !Number.isNaN(page)) await updatePage(supabase, bookId, page);
  refresh();
  return ok("Записано");
}

export async function saveBook(_prev: FormMessageState, formData: FormData): Promise<FormMessageState> {
  const session = await getSession();
  if (!session) return error("Нужно войти заново");
  const title = str(formData, "title").slice(0, 150);
  const pages = num(formData, "total_pages");
  const status = str(formData, "status") || "reading";
  const problems = [
    !title ? "Название книги" : null,
    checkRange(pages, 1, 10000, "Страниц"),
    !["reading", "want", "done"].includes(status) ? "Статус" : null,
  ].filter(Boolean);
  if (problems.length) return error(problems.join(". "));
  const supabase = await createClient();
  const { error: dbError } = await supabase.from("books").insert({
    title,
    author: str(formData, "author").slice(0, 100) || null,
    total_pages: pages === null ? null : Math.round(pages),
    status,
    finished_on: status === "done" ? todayKey() : null,
  });
  if (dbError) return error(dbError.message);
  refresh();
  return ok("Книга добавлена");
}

export async function updateBook(_prev: FormMessageState, formData: FormData): Promise<FormMessageState> {
  const id = str(formData, "id");
  const status = str(formData, "status");
  const page = num(formData, "current_page");
  const bad = checkRange(page, 0, 10000, "Страница");
  if (bad) return error(bad);
  const supabase = await createClient();
  if (["reading", "want", "done"].includes(status)) {
    await supabase
      .from("books")
      .update({ status, finished_on: status === "done" ? todayKey() : null })
      .eq("id", id);
  }
  // Дочитали до последней страницы — книга сама станет «Прочитано».
  if (page !== null) await updatePage(supabase, id, page);
  refresh();
  return ok("Сохранено");
}

export async function deleteBook(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("books").delete().eq("id", str(formData, "id"));
  refresh();
}

export async function setReadingGoal(_prev: FormMessageState, formData: FormData): Promise<FormMessageState> {
  const session = await getSession();
  if (!session) return error("Нужно войти заново");
  const goal = num(formData, "goal");
  const bad = goal === null ? "Сколько минут в день" : checkRange(goal, 5, 240, "Цель");
  if (bad) return error(bad);
  const supabase = await createClient();
  const { error: dbError } = await supabase.from("profiles").update({ reading_goal_min: Math.round(goal as number) }).eq("id", session.userId);
  if (dbError) return error(dbError.message);
  refresh();
  return ok("Цель обновлена");
}
