"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export type HealthKeyState = { key?: string; message?: { type: "error" | "info"; text: string } };

/** Новый личный ключ для команды. Показываем один раз — в базе только хэш. */
export async function createHealthKey(): Promise<HealthKeyState> {
  const session = await getSession();
  if (!session) return { message: { type: "error", text: "Нужно войти заново" } };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_health_token");
  if (error || typeof data !== "string") return { message: { type: "error", text: "Не получилось создать ключ, попробуйте ещё раз" } };
  revalidatePath("/profile/apple-health");
  return { key: data };
}

/** Отключить: ключ удаляется, команда перестаёт работать. Записанные данные остаются. */
export async function disconnectHealth() {
  const session = await getSession();
  if (!session) return;
  const supabase = await createClient();
  await supabase.from("health_tokens").delete().eq("user_id", session.userId);
  revalidatePath("/profile/apple-health");
}
