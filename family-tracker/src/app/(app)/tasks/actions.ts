"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkRange, error, isDate, num, ok, str, type FormMessageState } from "@/lib/form";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { afterChoreDone } from "@/lib/tasks";
import { todayKey } from "@/lib/time";

function refresh() {
  revalidatePath("/", "layout");
}

/** Куда вернуться после формы: только внутренние пути. */
function backTo(formData: FormData, fallback: string): string {
  const back = str(formData, "back");
  return back.startsWith("/") && !back.startsWith("//") ? back : fallback;
}

// ---------------------------------------------------------------------------
// Задачи
// ---------------------------------------------------------------------------

export async function saveTask(_prev: FormMessageState, formData: FormData): Promise<FormMessageState> {
  const session = await getSession();
  if (!session?.family) return error("Нужно войти заново");
  const id = str(formData, "id");
  const title = str(formData, "title").slice(0, 200);
  const due = str(formData, "due_date");
  const priority = Number(str(formData, "priority")) || 2;
  const planId = str(formData, "plan_id");
  const shared = str(formData, "kind") === "shared" || Boolean(planId);
  const who = str(formData, "assignee");
  const problems = [
    !title ? "Что нужно сделать" : null,
    due && !isDate(due) ? "Проверьте дату" : null,
    ![1, 2, 3].includes(priority) ? "Выберите приоритет" : null,
  ].filter(Boolean);
  if (problems.length) return error(problems.join(". "));

  const assignee = !shared ? null : who === "me" ? session.userId : who === "partner" ? (session.partner?.id ?? null) : null;
  const row = {
    title,
    note: str(formData, "note").slice(0, 2000) || null,
    due_date: due || null,
    priority,
    shared,
    assignee_id: assignee,
    plan_id: shared ? planId || null : null,
  };

  const supabase = await createClient();
  const { error: dbError } = id
    ? await supabase.from("tasks").update(row).eq("id", id)
    : await supabase.from("tasks").insert(row);
  if (dbError) return error(dbError.message);
  refresh();
  redirect(backTo(formData, "/tasks"));
}

/** Галочка «сделано» / вернуть в работу. */
export async function toggleTask(formData: FormData) {
  const session = await getSession();
  if (!session) return;
  const done = str(formData, "done") === "1";
  const supabase = await createClient();
  await supabase
    .from("tasks")
    .update(
      done
        ? { status: "done", done_at: new Date().toISOString(), done_by: session.userId }
        : { status: "todo", done_at: null, done_by: null },
    )
    .eq("id", str(formData, "id"));
  refresh();
}

export async function deleteTask(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("tasks").delete().eq("id", str(formData, "id"));
  refresh();
  redirect(backTo(formData, "/tasks"));
}

// ---------------------------------------------------------------------------
// Семейные планы
// ---------------------------------------------------------------------------

export async function savePlan(_prev: FormMessageState, formData: FormData): Promise<FormMessageState> {
  const session = await getSession();
  if (!session?.family) return error("Нужно войти заново");
  const id = str(formData, "id");
  const title = str(formData, "title").slice(0, 100);
  const date = str(formData, "target_date");
  if (!title) return error("Назовите план");
  if (date && !isDate(date)) return error("Проверьте дату");
  const row = {
    title,
    emoji: str(formData, "emoji").slice(0, 8) || "🎯",
    note: str(formData, "note").slice(0, 1000) || null,
    target_date: date || null,
  };
  const supabase = await createClient();
  if (id) {
    const { error: dbError } = await supabase.from("plans").update(row).eq("id", id);
    if (dbError) return error(dbError.message);
    refresh();
    redirect(`/tasks/plans/${id}`);
  }
  const { data, error: dbError } = await supabase.from("plans").insert(row).select("id").single();
  if (dbError) return error(dbError.message);
  refresh();
  redirect(`/tasks/plans/${data.id}`);
}

export async function togglePlanDone(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("plans").update({ done: str(formData, "done") === "1" }).eq("id", str(formData, "id"));
  refresh();
}

export async function deletePlan(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("plans").delete().eq("id", str(formData, "id"));
  refresh();
  redirect("/tasks/family");
}

// ---------------------------------------------------------------------------
// Привычки
// ---------------------------------------------------------------------------

export async function saveHabit(_prev: FormMessageState, formData: FormData): Promise<FormMessageState> {
  const session = await getSession();
  if (!session) return error("Нужно войти заново");
  const title = str(formData, "title").slice(0, 80);
  const frequency = str(formData, "frequency") === "weekly" ? "weekly" : "daily";
  const target = num(formData, "target_per_week");
  if (!title) return error("Назовите привычку");
  if (frequency === "weekly") {
    const bad = target === null ? "Сколько раз в неделю" : checkRange(target, 1, 7, "Раз в неделю");
    if (bad) return error(bad);
  }
  const supabase = await createClient();
  const { error: dbError } = await supabase.from("habits").insert({
    title,
    emoji: str(formData, "emoji").slice(0, 8) || "✅",
    frequency,
    target_per_week: frequency === "weekly" ? Math.round(target as number) : 7,
  });
  if (dbError) return error(dbError.message);
  refresh();
  return ok("Привычка добавлена");
}

export async function toggleHabit(formData: FormData) {
  const session = await getSession();
  if (!session) return;
  const habitId = str(formData, "habit_id");
  const date = str(formData, "date") || todayKey();
  if (!isDate(date) || date > todayKey()) return;
  const supabase = await createClient();
  if (str(formData, "checked") === "1") {
    await supabase.from("habit_checks").delete().eq("habit_id", habitId).eq("check_date", date);
  } else {
    await supabase.from("habit_checks").upsert({ habit_id: habitId, check_date: date }, { onConflict: "habit_id,check_date" });
  }
  refresh();
}

export async function archiveHabit(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("habits").update({ archived: true }).eq("id", str(formData, "id"));
  refresh();
}

// ---------------------------------------------------------------------------
// Цели
// ---------------------------------------------------------------------------

export async function saveGoal(_prev: FormMessageState, formData: FormData): Promise<FormMessageState> {
  const session = await getSession();
  if (!session) return error("Нужно войти заново");
  const title = str(formData, "title").slice(0, 100);
  const target = num(formData, "target");
  const deadline = str(formData, "deadline");
  const problems = [
    !title ? "Назовите цель" : null,
    checkRange(target, 0.1, 100000000, "Цель"),
    deadline && !isDate(deadline) ? "Проверьте дату" : null,
  ].filter(Boolean);
  if (problems.length) return error(problems.join(". "));
  const supabase = await createClient();
  const { error: dbError } = await supabase.from("goals").insert({
    title,
    target,
    unit: str(formData, "unit").slice(0, 20) || null,
    deadline: deadline || null,
  });
  if (dbError) return error(dbError.message);
  refresh();
  return ok("Цель добавлена");
}

export async function updateGoalProgress(_prev: FormMessageState, formData: FormData): Promise<FormMessageState> {
  const current = num(formData, "current");
  const bad = current === null ? "Сколько уже сделано" : checkRange(current, 0, 100000000, "Прогресс");
  if (bad) return error(bad);
  const supabase = await createClient();
  const { data } = await supabase.from("goals").select("target").eq("id", str(formData, "id")).maybeSingle();
  const done = data?.target ? (current as number) >= Number(data.target) : false;
  const { error: dbError } = await supabase.from("goals").update({ current, done }).eq("id", str(formData, "id"));
  if (dbError) return error(dbError.message);
  refresh();
  return ok(done ? "Цель достигнута! 🎉" : "Обновлено");
}

export async function toggleGoalDone(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("goals").update({ done: str(formData, "done") === "1" }).eq("id", str(formData, "id"));
  refresh();
}

export async function deleteGoal(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("goals").delete().eq("id", str(formData, "id"));
  refresh();
}

// ---------------------------------------------------------------------------
// Домашние дела по очереди
// ---------------------------------------------------------------------------

export async function saveChore(_prev: FormMessageState, formData: FormData): Promise<FormMessageState> {
  const session = await getSession();
  if (!session?.family) return error("Нужно войти заново");
  const title = str(formData, "title").slice(0, 80);
  const every = num(formData, "every_days");
  const first = str(formData, "next_due") || todayKey();
  const who = str(formData, "assignee");
  const problems = [
    !title ? "Что за дело" : null,
    every === null ? "Как часто" : checkRange(every, 1, 90, "Каждые N дней"),
    !isDate(first) ? "Проверьте дату" : null,
  ].filter(Boolean);
  if (problems.length) return error(problems.join(". "));
  const supabase = await createClient();
  const { error: dbError } = await supabase.from("chores").insert({
    title,
    emoji: str(formData, "emoji").slice(0, 8) || "🧹",
    every_days: Math.round(every as number),
    rotate: formData.get("rotate") === "on",
    assignee_id: who === "partner" ? (session.partner?.id ?? null) : who === "both" ? null : session.userId,
    next_due: first,
  });
  if (dbError) return error(dbError.message);
  refresh();
  return ok("Добавлено");
}

/** «Сделано»: срок переносится, очередь переходит ко второму. */
export async function doneChore(formData: FormData) {
  const session = await getSession();
  if (!session?.family) return;
  const supabase = await createClient();
  const { data: chore } = await supabase
    .from("chores")
    .select("every_days, rotate, assignee_id")
    .eq("id", str(formData, "id"))
    .maybeSingle();
  if (!chore) return;
  const members = [session.userId, ...(session.partner ? [session.partner.id] : [])];
  const today = todayKey();
  const next = afterChoreDone(chore, session.userId, members, today);
  await supabase
    .from("chores")
    .update({ ...next, last_done_on: today, last_done_by: session.userId })
    .eq("id", str(formData, "id"));
  refresh();
}

export async function deleteChore(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("chores").delete().eq("id", str(formData, "id"));
  refresh();
}
