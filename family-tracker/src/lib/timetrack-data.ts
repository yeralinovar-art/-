import "server-only";
import { cache } from "react";
import { addDays } from "@/lib/health";
import { createClient } from "@/lib/supabase/server";
import { dayStartIso, type BookStatus, type Project, type ReadingSession, type TimeEntry } from "@/lib/timetrack";

// Проекты, время и чтение — личные (RLS: только владелец).

export const getProjects = cache(async (includeArchived = false): Promise<Project[]> => {
  const supabase = await createClient();
  let q = supabase.from("projects").select("id, name, kind, color_slot, archived").order("created_at");
  if (!includeArchived) q = q.eq("archived", false);
  const { data } = await q;
  return (data ?? []) as Project[];
});

/** Записи времени с даты (по Алматы) + запущенный таймер. */
export const getTimeEntries = cache(async (sinceDate: string): Promise<TimeEntry[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("time_entries")
    .select("id, project_id, started_at, ended_at, note")
    .or(`started_at.gte."${dayStartIso(sinceDate)}",ended_at.is.null`)
    .order("started_at", { ascending: false });
  return (data ?? []) as TimeEntry[];
});

export const getRunningTimer = cache(async (): Promise<TimeEntry | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("time_entries")
    .select("id, project_id, started_at, ended_at, note")
    .is("ended_at", null)
    .maybeSingle();
  return (data as TimeEntry | null) ?? null;
});

export type Book = {
  id: string;
  title: string;
  author: string | null;
  status: BookStatus;
  total_pages: number | null;
  current_page: number;
  finished_on: string | null;
};

export const getBooks = cache(async (): Promise<Book[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("books")
    .select("id, title, author, status, total_pages, current_page, finished_on")
    .order("created_at", { ascending: false });
  return (data ?? []) as Book[];
});

/** Сессии чтения за ~2 месяца (серия, неделя, месяц) и запущенная. */
export const getReading = cache(async (today: string): Promise<{ sessions: ReadingSession[]; running: ReadingSession | null }> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reading_sessions")
    .select("id, book_id, read_on, started_at, minutes")
    .or(`read_on.gte.${addDays(today, -62)},minutes.is.null`)
    .order("created_at", { ascending: false });
  const sessions = (data ?? []) as ReadingSession[];
  return { sessions, running: sessions.find((s) => s.minutes === null) ?? null };
});

export const getReadingGoal = cache(async (userId: string): Promise<number> => {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("reading_goal_min").eq("id", userId).maybeSingle();
  return data?.reading_goal_min ?? 20;
});
