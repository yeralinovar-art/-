"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type OnboardingState = { message?: { type: "error" | "info"; text: string }; code?: string };

export async function createFamily(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const name = String(formData.get("name") ?? "").trim();
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_family", { p_name: name });
  if (error) return { message: { type: "error", text: error.message } };
  redirect("/profile?welcome=1");
}

export async function joinFamily(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const code = String(formData.get("code") ?? "").trim();
  if (code.length < 6) return { code, message: { type: "error", text: "Код состоит из 6 символов" } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_family", { p_code: code });
  if (error) return { code, message: { type: "error", text: error.message } };
  redirect("/");
}
