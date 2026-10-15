import "server-only";
import webpush from "web-push";

// Отправка Web Push. Ключи VAPID — из переменных окружения; приватный только на сервере.

export type PushTarget = { endpoint: string; p256dh: string; auth: string };
export type PushMessage = { title: string; body: string; url: string; tag?: string };

let configured = false;

export function pushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function configure() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || process.env.NEXT_PUBLIC_SITE_URL || "https://semya-one.vercel.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

/** Отправить; вернуть адреса, которые браузер отозвал (их надо удалить). */
export async function sendPushes(items: (PushTarget & PushMessage)[]): Promise<{ sent: number; gone: string[]; failed: number }> {
  if (!pushConfigured()) throw new Error("VAPID keys are not set");
  configure();
  const gone: string[] = [];
  let sent = 0;
  let failed = 0;
  await Promise.all(
    items.map(async (i) => {
      try {
        await webpush.sendNotification(
          { endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } },
          JSON.stringify({ title: i.title, body: i.body, url: i.url, tag: i.tag }),
          { TTL: 60 * 60 * 4, urgency: "normal", timeout: 10_000 },
        );
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.push(i.endpoint);
        else {
          failed++;
          console.error("push", status, (e as Error).message);
        }
      }
    }),
  );
  return { sent, gone, failed };
}
