import "server-only";
import { cache } from "react";
import { addDays } from "@/lib/health";
import { createClient } from "@/lib/supabase/server";
import type { Chore, Habit, Task } from "@/lib/tasks";

// Задачи (свои + общие), планы, привычки, цели и дела семьи. Доступ ограничивает RLS.

const TASK_COLUMNS = "id, owner_id, shared, assignee_id, plan_id, title, note, due_date, priority, status, done_at, done_by, created_at";

/** Открытые задачи и выполненные за последнюю неделю. */
export const getTasks = cache(async (today: string): Promise<Task[]> => {
  const supabase = await createClient();
  const since = `${addDays(today, -7)}T00:00:00Z`;
  const { data } = await supabase
    .from("tasks")
    .select(TASK_COLUMNS)
    .or(`status.neq.done,done_at.gte.${since}`)
    .order("created_at");
  return (data ?? []) as Task[];
});

export const getTask = cache(async (id: string): Promise<Task | null> => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("tasks").select(TASK_COLUMNS).eq("id", id).maybeSingle();
  return (data as Task | null) ?? null;
});

export type Plan = { id: string; title: string; emoji: string; note: string | null; target_date: string | null; done: boolean };

export const getPlans = cache(async (): Promise<(Plan & { tasks: Pick<Task, "id" | "status">[] })[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("plans")
    .select("id, title, emoji, note, target_date, done, tasks(id, status)")
    .order("done")
    .order("target_date", { nullsFirst: false })
    .order("created_at");
  return (data ?? []) as (Plan & { tasks: Pick<Task, "id" | "status">[] })[];
});

export const getPlan = cache(async (id: string): Promise<(Plan & { tasks: Task[] }) | null> => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("plans")
    .select(`id, title, emoji, note, target_date, done, tasks(${TASK_COLUMNS})`)
    .eq("id", id)
    .maybeSingle();
  return (data as (Plan & { tasks: Task[] }) | null) ?? null;
});

/** Привычки и отметки за последние 10 недель (хватает для серий и недельного вида). */
export const getHabits = cache(async (today: string): Promise<{ habits: Habit[]; checks: Map<string, Set<string>> }> => {
  const supabase = await createClient();
  const [{ data: habits }, { data: checks }] = await Promise.all([
    supabase.from("habits").select("id, title, emoji, frequency, target_per_week, archived").eq("archived", false).order("created_at"),
    supabase.from("habit_checks").select("habit_id, check_date").gte("check_date", addDays(today, -70)),
  ]);
  const map = new Map<string, Set<string>>();
  for (const c of checks ?? []) {
    if (!map.has(c.habit_id)) map.set(c.habit_id, new Set());
    map.get(c.habit_id)!.add(c.check_date);
  }
  return { habits: (habits ?? []) as Habit[], checks: map };
});

export type Goal = { id: string; title: string; deadline: string | null; target: number | null; current: number; unit: string | null; done: boolean };

export const getGoals = cache(async (): Promise<Goal[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("goals")
    .select("id, title, deadline, target, current, unit, done")
    .order("done")
    .order("deadline", { nullsFirst: false });
  return (data ?? []).map((g) => ({ ...g, target: g.target === null ? null : Number(g.target), current: Number(g.current) }));
});

export const getChores = cache(async (): Promise<Chore[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chores")
    .select("id, title, emoji, every_days, rotate, assignee_id, next_due, last_done_on, last_done_by")
    .order("next_due");
  return (data ?? []) as Chore[];
});
