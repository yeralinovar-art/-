"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { estimateKcal, isActivityKind } from "@/lib/activity";
import { getLatestWeight } from "@/lib/data";
import { checkRange, error, isDate, num, ok, str, type FormMessageState } from "@/lib/form";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { todayKey } from "@/lib/time";
import { workoutByKey, workoutKcal } from "@/lib/workouts";

function refresh() {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Мини-тренировка дня
// ---------------------------------------------------------------------------

/** «Сделано» или «плохо себя чувствую — пропустить». Сделанная идёт в активность. */
export async function logWorkout(formData: FormData) {
  const session = await getSession();
  if (!session?.family) redirect("/login");
  const workout = workoutByKey(str(formData, "workout_key"));
  const version = str(formData, "version") === "pregnancy" ? "pregnancy" : "regular";
  const status = str(formData, "status") === "skipped" ? "skipped" : "done";
  if (!workout) return;
  const minutes = Math.min(120, Math.max(1, Math.round(Number(str(formData, "minutes")) || 12)));
  const today = todayKey();
  const supabase = await createClient();

  // Повторная отметка за день заменяет прежнюю (и её запись в активности).
  await supabase.from("workout_logs").delete().eq("user_id", session.userId).eq("log_date", today);
  const kcal = status === "done" ? workoutKcal(minutes, version) : 0;
  const { data: log } = await supabase
    .from("workout_logs")
    .insert({ log_date: today, workout_key: workout.key, version, status, minutes: status === "done" ? minutes : null, kcal })
    .select("id")
    .single();
  if (log && status === "done") {
    await supabase.from("activities").insert({
      act_date: today,
      kind: "mini",
      minutes,
      kcal,
      note: workout.title,
      source: "mini",
      workout_log_id: log.id,
    });
  }
  refresh();
  if (str(formData, "from") === "player") redirect("/workout?finished=1");
}

export async function undoWorkout() {
  const session = await getSession();
  if (!session) return;
  const supabase = await createClient();
  await supabase.from("workout_logs").delete().eq("user_id", session.userId).eq("log_date", todayKey());
  refresh();
}

// ---------------------------------------------------------------------------
// Активность и шаги
// ---------------------------------------------------------------------------

export async function addActivity(_prev: FormMessageState, formData: FormData): Promise<FormMessageState> {
  const session = await getSession();
  if (!session) return error("Нужно войти заново");
  const kind = str(formData, "kind");
  const minutes = num(formData, "minutes");
  const kcalIn = num(formData, "kcal");
  const date = str(formData, "date") || todayKey();
  const problems = [
    !isActivityKind(kind) ? "Выберите вид активности" : null,
    minutes === null ? "Сколько минут" : checkRange(minutes, 1, 600, "Минуты"),
    checkRange(kcalIn, 0, 5000, "Ккал"),
    !isDate(date) || date > todayKey() ? "Проверьте дату" : null,
  ].filter(Boolean);
  if (problems.length) return error(problems.join(". "));
  const weight = await getLatestWeight();
  const kcal = kcalIn ?? estimateKcal(kind as Parameters<typeof estimateKcal>[0], minutes as number, weight?.kg ?? null);
  const supabase = await createClient();
  const { error: dbError } = await supabase.from("activities").insert({
    act_date: date,
    kind,
    minutes: Math.round(minutes as number),
    kcal: Math.round(kcal),
    note: str(formData, "note").slice(0, 200) || null,
  });
  if (dbError) return error(dbError.message);
  refresh();
  return ok(`Записано · ~${Math.round(kcal)} ккал`);
}

export async function deleteActivity(formData: FormData) {
  const supabase = await createClient();
  // Мини-тренировку снимаем вместе с отметкой (каскад удалит запись активности).
  const { data } = await supabase.from("activities").select("workout_log_id").eq("id", str(formData, "id")).maybeSingle();
  if (data?.workout_log_id) await supabase.from("workout_logs").delete().eq("id", data.workout_log_id);
  else await supabase.from("activities").delete().eq("id", str(formData, "id"));
  refresh();
}

export async function saveSteps(_prev: FormMessageState, formData: FormData): Promise<FormMessageState> {
  const session = await getSession();
  if (!session) return error("Нужно войти заново");
  const steps = num(formData, "steps");
  const active = num(formData, "active_kcal");
  const date = str(formData, "date") || todayKey();
  const problems = [
    steps === null ? "Сколько шагов" : checkRange(steps, 0, 200000, "Шаги"),
    checkRange(active, 0, 10000, "Активные ккал"),
    !isDate(date) || date > todayKey() ? "Проверьте дату" : null,
  ].filter(Boolean);
  if (problems.length) return error(problems.join(". "));
  const supabase = await createClient();
  const { error: dbError } = await supabase.from("daily_steps").upsert(
    {
      user_id: session.userId,
      step_date: date,
      steps: Math.round(steps as number),
      active_kcal: active === null ? null : Math.round(active),
      source: "manual",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,step_date" },
  );
  if (dbError) return error(dbError.message);
  refresh();
  return ok("Шаги записаны");
}

export async function saveActivityGoals(_prev: FormMessageState, formData: FormData): Promise<FormMessageState> {
  const session = await getSession();
  if (!session) return error("Нужно войти заново");
  const steps = num(formData, "steps_goal");
  const workouts = num(formData, "workouts_week_goal");
  const problems = [
    steps === null ? "Цель по шагам" : checkRange(steps, 1000, 50000, "Шаги"),
    workouts === null ? "Тренировок в неделю" : checkRange(workouts, 1, 14, "Тренировок"),
  ].filter(Boolean);
  if (problems.length) return error(problems.join(". "));
  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from("health_profiles")
    .upsert(
      { user_id: session.userId, steps_goal: Math.round(steps as number), workouts_week_goal: Math.round(workouts as number) },
      { onConflict: "user_id" },
    );
  if (dbError) return error(dbError.message);
  refresh();
  return ok("Цели сохранены");
}

// ---------------------------------------------------------------------------
// Цитаты
// ---------------------------------------------------------------------------

export async function toggleFavorite(formData: FormData) {
  const session = await getSession();
  if (!session) return;
  const supabase = await createClient();
  const id = str(formData, "quote_id");
  if (str(formData, "favorite") === "1") await supabase.from("quote_favorites").delete().eq("quote_id", id);
  else await supabase.from("quote_favorites").insert({ quote_id: id });
  refresh();
}

export async function addQuote(_prev: FormMessageState, formData: FormData): Promise<FormMessageState> {
  const session = await getSession();
  if (!session?.family) return error("Нужно войти заново");
  const text = str(formData, "text").slice(0, 400);
  if (text.length < 3) return error("Напишите цитату");
  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from("quotes")
    .insert({ family_id: session.family.id, text, author: str(formData, "author").slice(0, 80) || null });
  if (dbError) return error(dbError.message);
  refresh();
  return ok("Цитата добавлена — будет цитатой дня примерно раз в 4 дня, начиная с завтра");
}

export async function deleteQuote(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("quotes").delete().eq("id", str(formData, "id"));
  refresh();
}
