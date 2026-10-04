import "server-only";
import { cache } from "react";
import type { GrowthEntry, Vaccine, Visit } from "@/lib/family-health";
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

// ---------------------------------------------------------------------------
// Рост ребёнка, прививки, визиты (этап 2.3)
// ---------------------------------------------------------------------------

export const getGrowth = cache(async (childId: string): Promise<GrowthEntry[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("child_growth")
    .select("id, child_id, measured_on, height_cm, weight_kg, note")
    .eq("child_id", childId)
    .order("measured_on");
  return (data ?? []).map((r) => ({
    ...r,
    height_cm: r.height_cm === null ? null : Number(r.height_cm),
    weight_kg: r.weight_kg === null ? null : Number(r.weight_kg),
  }));
});

export const getVaccines = cache(async (childId: string): Promise<Vaccine[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("child_vaccines")
    .select("id, child_id, name, planned_on, given_on, note")
    .eq("child_id", childId)
    .order("given_on", { ascending: false, nullsFirst: true })
    .order("planned_on");
  return (data ?? []) as Vaccine[];
});

/** Свои визиты и визиты детей (остальное отсекает RLS). */
export const getVisits = cache(async (): Promise<Visit[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("medical_visits")
    .select("id, owner_id, child_id, kind, title, visit_date, visit_time, place, questions, result, done")
    .order("visit_date", { ascending: false });
  return (data ?? []) as Visit[];
});
