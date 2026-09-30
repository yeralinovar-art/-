"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { translateAuthError } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  message?: { type: "error" | "info"; text: string };
  // Введённые значения: React сбрасывает форму после отправки, возвращаем их обратно.
  fields?: { email?: string; displayName?: string };
};

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  };
}

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  const fields = { email };
  if (!email || !password) return { fields, message: { type: "error", text: "Введите email и пароль" } };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { fields, message: { type: "error", text: translateAuthError(error.message) } };

  redirect("/");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  const displayName = String(formData.get("display_name") ?? "").trim();
  const fields = { email, displayName };
  if (!displayName) return { fields, message: { type: "error", text: "Как вас зовут?" } };
  if (!email) return { fields, message: { type: "error", text: "Введите email" } };
  if (password.length < 8) {
    return { fields, message: { type: "error", text: "Пароль — минимум 8 символов" } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: `${await siteUrl()}/auth/confirm?next=/onboarding`,
    },
  });
  if (error) return { fields, message: { type: "error", text: translateAuthError(error.message) } };

  // Если подтверждение email выключено, сессия уже есть.
  if (data.session) redirect("/onboarding");

  return {
    fields,
    message: {
      type: "info",
      text: `Мы отправили письмо на ${email}. Откройте ссылку из письма, затем войдите здесь.`,
    },
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
