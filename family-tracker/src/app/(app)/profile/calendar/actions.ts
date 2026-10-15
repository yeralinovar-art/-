"use server";

import { revalidatePath } from "next/cache";
import { eventsInRange, normalizeIcsUrl } from "@/lib/calendar";
import { fetchIcs } from "@/lib/calendar-data";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { todayKey } from "@/lib/time";

type Message = { type: "error" | "info"; text: string };
export type FeedKeyState = { key?: string; message?: Message };
export type ImportState = { message?: Message };

function refresh() {
  revalidatePath("/profile/calendar");
  revalidatePath("/");
}

/** Новая ссылка-подписка. Показываем один раз — в базе только хэш. */
export async function createFeedKey(): Promise<FeedKeyState> {
  const session = await getSession();
  if (!session) return { message: { type: "error", text: "Нужно войти заново" } };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_calendar_feed_token");
  if (error || typeof data !== "string") return { message: { type: "error", text: "Не получилось создать ссылку, попробуйте ещё раз" } };
  refresh();
  return { key: data };
}

/** Сохранить секретный iCal-адрес. Сначала проверяем, что он открывается и читается. */
export async function saveImportUrl(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const session = await getSession();
  if (!session) return { message: { type: "error", text: "Нужно войти заново" } };
  const url = normalizeIcsUrl(String(formData.get("import_url") ?? ""));
  if (!url) return { message: { type: "error", text: "Нужна ссылка, которая начинается с https://" } };

  let count: number;
  try {
    count = eventsInRange(await fetchIcs(url, true), todayKey(), 1).length;
  } catch {
    return {
      message: {
        type: "error",
        text: "Не получилось открыть календарь по этой ссылке. Проверьте, что скопирован «Секретный адрес в формате iCal» целиком.",
      },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("calendar_links").upsert({ import_url: url }, { onConflict: "user_id" });
  if (error) return { message: { type: "error", text: "Не получилось сохранить, попробуйте ещё раз" } };
  refresh();
  return { message: { type: "info", text: count ? `Подключено. Сегодня событий: ${count}.` : "Подключено. Сегодня событий нет." } };
}

export async function removeImportUrl() {
  const session = await getSession();
  if (!session) return;
  const supabase = await createClient();
  await supabase.from("calendar_links").update({ import_url: null }).eq("user_id", session.userId);
  refresh();
}

/** Отключить всё: ссылка-подписка перестаёт работать, Google-календарь отвязывается. */
export async function disconnectCalendar() {
  const session = await getSession();
  if (!session) return;
  const supabase = await createClient();
  await supabase.from("calendar_links").delete().eq("user_id", session.userId);
  refresh();
}
