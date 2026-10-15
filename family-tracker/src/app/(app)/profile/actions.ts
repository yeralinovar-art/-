"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";

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

/** Оформление: cookie на год; сервер сразу отдаёт нужную тему. */
export async function setTheme(theme: string) {
  const value = parseTheme(theme);
  const store = await cookies();
  if (value === "system") store.delete(THEME_COOKIE);
  else store.set(THEME_COOKIE, value, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: false });
}
