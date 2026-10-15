import "server-only";
import { cache } from "react";
import { eventsInRange, type DayEvent } from "@/lib/calendar";
import { createClient } from "@/lib/supabase/server";

export type CalendarLink = { hasFeed: boolean; importUrl: string | null; lastFeedAt: string | null };

export const getCalendarLink = cache(async (): Promise<CalendarLink> => {
  const supabase = await createClient();
  const { data } = await supabase.from("calendar_links").select("feed_token_hash, import_url, last_feed_at").maybeSingle();
  return { hasFeed: Boolean(data?.feed_token_hash), importUrl: data?.import_url ?? null, lastFeedAt: data?.last_feed_at ?? null };
});

const MAX_BYTES = 3_000_000;

/** Адрес не должен вести во внутреннюю сеть: только https и обычное доменное имя. */
export function isPublicHost(url: string): boolean {
  const host = new URL(url).hostname.toLowerCase();
  return host.includes(".") && !/^[\d.]+$/.test(host) && !host.includes(":") && !/(^|\.)(localhost|local|internal)$/.test(host);
}

/** Скачать ICS. fresh — без кэша (проверка при сохранении), иначе кэш на 15 минут. */
export async function fetchIcs(url: string, fresh = false): Promise<string> {
  if (!isPublicHost(url)) throw new Error("host");
  const res = await fetch(url, {
    signal: AbortSignal.timeout(6000),
    headers: { accept: "text/calendar" },
    ...(fresh ? { cache: "no-store" as const } : { next: { revalidate: 900 } }),
  });
  if (!res.ok) throw new Error(`http ${res.status}`);
  const text = await res.text();
  if (text.length > MAX_BYTES) throw new Error("too big");
  if (!text.includes("BEGIN:VCALENDAR")) throw new Error("not ics");
  return text;
}

/** События подключённого календаря на дни [from, from + days). null — не подключён или недоступен. */
export async function getImportedEvents(from: string, days: number): Promise<{ events: DayEvent[] } | { error: true } | null> {
  const link = await getCalendarLink();
  if (!link.importUrl) return null;
  try {
    return { events: eventsInRange(await fetchIcs(link.importUrl), from, days) };
  } catch (e) {
    console.error("calendar import", e instanceof Error ? e.message : e);
    return { error: true };
  }
}
