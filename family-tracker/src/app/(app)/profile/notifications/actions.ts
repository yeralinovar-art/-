"use server";

import { revalidatePath } from "next/cache";
import { sendPushes, pushConfigured } from "@/lib/push";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

type Message = { type: "error" | "info"; text: string };
export type PrefsState = { message?: Message };

export type BrowserSubscription = { endpoint: string; keys: { p256dh: string; auth: string } };

function valid(sub: BrowserSubscription) {
  return (
    typeof sub?.endpoint === "string" &&
    /^https:\/\//.test(sub.endpoint) &&
    sub.endpoint.length <= 1000 &&
    typeof sub.keys?.p256dh === "string" &&
    sub.keys.p256dh.length <= 200 &&
    typeof sub.keys?.auth === "string" &&
    sub.keys.auth.length <= 100
  );
}

/** Сохранить подписку этого устройства. */
export async function savePushSubscription(sub: BrowserSubscription): Promise<{ ok: boolean }> {
  const session = await getSession();
  if (!session || !valid(sub)) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_push_subscription", { p_endpoint: sub.endpoint, p_p256dh: sub.keys.p256dh, p_auth: sub.keys.auth });
  revalidatePath("/profile/notifications");
  return { ok: !error };
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const session = await getSession();
  if (!session) return;
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  revalidatePath("/profile/notifications");
}

/** Пробное уведомление на все свои устройства. */
export async function sendTestPush(): Promise<Message> {
  const session = await getSession();
  if (!session) return { type: "error", text: "Нужно войти заново" };
  if (!pushConfigured()) return { type: "error", text: "Уведомления ещё не настроены на сервере" };
  const supabase = await createClient();
  const { data: subs } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth");
  if (!subs?.length) return { type: "error", text: "Сначала включите уведомления на этом устройстве" };
  const result = await sendPushes(
    subs.map((s) => ({ ...s, title: "Семья", body: "Уведомления работают 👍", url: "/profile/notifications", tag: "test" })),
  );
  if (result.gone.length) await supabase.from("push_subscriptions").delete().in("endpoint", result.gone);
  if (!result.sent) return { type: "error", text: "Не получилось отправить. Выключите и снова включите уведомления." };
  return { type: "info", text: `Отправлено на устройств: ${result.sent}. Должно прийти через пару секунд.` };
}

export async function savePrefs(_prev: PrefsState, formData: FormData): Promise<PrefsState> {
  const session = await getSession();
  if (!session) return { message: { type: "error", text: "Нужно войти заново" } };
  const on = (k: string) => formData.get(k) === "on";
  const supabase = await createClient();
  const { error } = await supabase.from("notification_prefs").upsert(
    { user_id: session.userId, meds: on("meds"), tasks: on("tasks"), visits: on("visits"), water: on("water"), workout: on("workout"), updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) return { message: { type: "error", text: "Не получилось сохранить" } };
  revalidatePath("/profile/notifications");
  return { message: { type: "info", text: "Сохранено" } };
}
