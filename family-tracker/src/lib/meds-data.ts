import "server-only";
import { cache } from "react";
import type { Dose, Medication } from "@/lib/meds";
import { createClient } from "@/lib/supabase/server";

export type Child = { id: string; name: string; birth_date: string | null; sex: "female" | "male" | null };

export const getChildren = cache(async (): Promise<Child[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("children").select("id, name, birth_date, sex").order("birth_date");
  return (data ?? []) as Child[];
});

/** Свои лекарства и лекарства детей (остальное отсекает RLS). */
export const getMedications = cache(async (includeArchived = false): Promise<Medication[]> => {
  const supabase = await createClient();
  let q = supabase
    .from("medications")
    .select("id, owner_id, child_id, name, dose, times, weekdays, note, start_date, end_date, archived")
    .order("created_at");
  if (!includeArchived) q = q.eq("archived", false);
  const { data } = await q;
  return (data ?? []) as Medication[];
});

export const getDoses = cache(async (date: string): Promise<Dose[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("medication_doses")
    .select("medication_id, dose_date, slot, taken_at, taken_by")
    .eq("dose_date", date);
  return (data ?? []) as Dose[];
});
