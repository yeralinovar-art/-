import "server-only";
import { cache } from "react";
import type { Quote } from "@/lib/activity";
import { createClient } from "@/lib/supabase/server";

// Цитаты (общие + семьи), отметки мини-тренировки (видны семье), активность и шаги (личные).

export const getQuotes = cache(async (): Promise<Quote[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("quotes").select("id, text, author, ord, created_at, family_id");
  return (data ?? []) as Quote[];
});

export const getFavoriteIds = cache(async (): Promise<Set<string>> => {
  const supabase = await createClient();
  const { data } = await supabase.from("quote_favorites").select("quote_id");
  return new Set((data ?? []).map((f) => f.quote_id));
});

export type WorkoutLog = {
  id: string;
  user_id: string;
  log_date: string;
  workout_key: string;
  version: "regular" | "pregnancy";
  status: "done" | "skipped";
  minutes: number | null;
};

export const getWorkoutLogs = cache(async (since: string): Promise<WorkoutLog[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workout_logs")
    .select("id, user_id, log_date, workout_key, version, status, minutes")
    .gte("log_date", since);
  return (data ?? []) as WorkoutLog[];
});

export type Activity = { id: string; act_date: string; kind: string; minutes: number; kcal: number; note: string | null; source: string };

export const getActivities = cache(async (since: string): Promise<Activity[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activities")
    .select("id, act_date, kind, minutes, kcal, note, source")
    .gte("act_date", since)
    .order("act_date", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as Activity[];
});

export type StepsDay = { step_date: string; steps: number; active_kcal: number | null };

export const getSteps = cache(async (since: string): Promise<StepsDay[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("daily_steps").select("step_date, steps, active_kcal").gte("step_date", since);
  return (data ?? []) as StepsDay[];
});

export const getActivityGoals = cache(async (): Promise<{ steps: number; workoutsWeek: number }> => {
  const supabase = await createClient();
  const { data } = await supabase.from("health_profiles").select("steps_goal, workouts_week_goal").maybeSingle();
  return { steps: data?.steps_goal ?? 8000, workoutsWeek: data?.workouts_week_goal ?? 3 };
});

/** Сожжено за день: тренировки и активные ккал из шагов (берётся большее). */
export function dayBurn(activities: Activity[], steps: StepsDay[], date: string) {
  const acts = activities.filter((a) => a.act_date === date);
  const s = steps.find((x) => x.step_date === date);
  return {
    workoutKcal: acts.reduce((t, a) => t + a.kcal, 0),
    workoutMinutes: acts.reduce((t, a) => t + a.minutes, 0),
    steps: s?.steps ?? 0,
    activeKcal: s?.active_kcal ?? null,
  };
}
