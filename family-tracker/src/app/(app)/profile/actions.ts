"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export type ProfileState = { message?: { type: "error" | "info"; text: string } };

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const session = await getSession();
  if (!session) return { message: { type: "error", text: "Нужно войти заново" } };

  const displayName = String(formData.get("display_name") ?? "").trim().slice(0, 40);
  const avatarEmoji = String(formData.get("avatar_emoji") ?? "").trim().slice(0, 8);
  const familyName = String(formData.get("family_name") ?? "").trim().slice(0, 60);
  if (!displayName) return { message: { type: "error", text: "Имя не может быть пустым" } };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName, ...(avatarEmoji && { avatar_emoji: avatarEmoji }) })
    .eq("id", session.userId);
  if (error) return { message: { type: "error", text: error.message } };

  if (familyName && session.family && familyName !== session.family.name) {
    const { error: famError } = await supabase
      .from("families")
      .update({ name: familyName })
      .eq("id", session.family.id);
    if (famError) return { message: { type: "error", text: famError.message } };
  }

  revalidatePath("/", "layout");
  return { message: { type: "info", text: "Сохранено" } };
}
