// Календарь: выгрузка дел в ICS-подписку и разбор чужого ICS (Google) на «сегодня».
// Время везде — Алматы (UTC+5 круглый год).

import ICAL from "ical.js";

export type FeedEvent = {
  uid: string;
  kind: "task" | "visit" | "vaccine" | "plan";
  date: string;
  time?: string | null;
  title: string;
  note?: string | null;
  place?: string | null;
  child?: string | null;
  emoji?: string | null;
  shared?: boolean;
};

const ALMATY_OFFSET_H = 5;

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Перенос строк ICS по 75 байт, не разрывая символы UTF-8. */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let cur = "";
  let curBytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    const limit = parts.length ? 74 : 75; // продолжение начинается с пробела
    if (curBytes + b > limit) {
      parts.push(cur);
      cur = "";
      curBytes = 0;
    }
    cur += ch;
    curBytes += b;
  }
  parts.push(cur);
  return parts.join("\r\n ");
}

const compact = (date: string) => date.replaceAll("-", "");

function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** «2026-10-20» + «14:30» по Алматы → 20261020T093000Z. */
function utcStamp(date: string, time: string, plusMinutes = 0): string {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCMinutes(h * 60 + m - ALMATY_OFFSET_H * 60 + plusMinutes);
  return d.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
}

export function eventTitle(e: FeedEvent): string {
  switch (e.kind) {
    case "task":
      return `📌 ${e.title}`;
    case "visit":
      return `🩺 ${e.title}${e.child ? ` — ${e.child}` : ""}`;
    case "vaccine":
      return `💉 Прививка: ${e.title}${e.child ? ` — ${e.child}` : ""}`;
    case "plan":
      return `${e.emoji || "🎯"} ${e.title}`;
  }
}

/** ICS-календарь для подписки в Google/iPhone. */
export function buildIcs(events: FeedEvent[], opts: { name: string; url: string; now?: Date }): string {
  const stamp = (opts.now ?? new Date()).toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Semya//RU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(opts.name)}`,
    "X-WR-TIMEZONE:Asia/Almaty",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const e of events) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) continue;
    const timed = e.time && /^\d{1,2}:\d{2}$/.test(e.time);
    lines.push("BEGIN:VEVENT", `UID:${e.uid}@semya`, `DTSTAMP:${stamp}`);
    if (timed) {
      lines.push(`DTSTART:${utcStamp(e.date, e.time!)}`, `DTEND:${utcStamp(e.date, e.time!, 60)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${compact(e.date)}`, `DTEND;VALUE=DATE:${compact(nextDay(e.date))}`, "TRANSP:TRANSPARENT");
    }
    lines.push(`SUMMARY:${escapeText(eventTitle(e))}`);
    if (e.place) lines.push(`LOCATION:${escapeText(e.place)}`);
    const desc = [e.note, e.kind === "task" && e.shared ? "Общее дело семьи" : null, opts.url].filter(Boolean).join("\n\n");
    lines.push(`DESCRIPTION:${escapeText(desc)}`, `URL:${opts.url}`, "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

// ---------------------------------------------------------------------------
// Разбор чужого календаря
// ---------------------------------------------------------------------------

export type DayEvent = { title: string; date: string; allDay: boolean; time: string | null; end: string | null; location: string | null };

const timeFmt = new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Almaty", hour: "2-digit", minute: "2-digit" });
const dateFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Almaty", year: "numeric", month: "2-digit", day: "2-digit" });

/** События из ICS, которые попадают в дни [from, from + days) по Алматы. */
export function eventsInRange(ics: string, from: string, days: number): DayEvent[] {
  const root = new ICAL.Component(ICAL.parse(ics));
  for (const tz of root.getAllSubcomponents("vtimezone")) {
    const zone = new ICAL.Timezone(tz);
    if (!ICAL.TimezoneService.has(zone.tzid)) ICAL.TimezoneService.register(zone);
  }
  const startMs = Date.parse(`${from}T00:00:00+05:00`);
  const endMs = startMs + days * 86_400_000;
  let to = from;
  for (let i = 1; i < days; i++) to = nextDay(to);

  const vevents = root.getAllSubcomponents("vevent");
  const exceptions = new Map<string, InstanceType<typeof ICAL.Component>[]>();
  for (const v of vevents) {
    if (v.hasProperty("recurrence-id")) {
      const uid = String(v.getFirstPropertyValue("uid"));
      exceptions.set(uid, [...(exceptions.get(uid) ?? []), v]);
    }
  }

  // Время без известного пояса («плавающее» или TZID без описания) считаем алматинским,
  // иначе сервер в UTC сдвинет его на 5 часов.
  const toMs = (t: InstanceType<typeof ICAL.Time>) => {
    const tzid = t.zone?.tzid;
    if (tzid && tzid !== "floating") return t.toJSDate().getTime();
    return Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute, t.second) - ALMATY_OFFSET_H * 3_600_000;
  };

  const out: DayEvent[] = [];
  const push = (summary: string, location: string | null, start: InstanceType<typeof ICAL.Time>, end: InstanceType<typeof ICAL.Time> | null) => {
    if (start.isDate) {
      // Событие на весь день: даты без времени, конец не включается.
      const s = start.toString().slice(0, 10);
      const e = end ? end.toString().slice(0, 10) : nextDay(s);
      if (e <= from || s > to) return;
      out.push({ title: summary, date: s < from ? from : s, allDay: true, time: null, end: null, location });
      return;
    }
    const sMs = toMs(start);
    const eMs = end ? toMs(end) : sMs;
    if (sMs >= endMs || Math.max(eMs, sMs + 1) <= startMs) return;
    const shown = new Date(Math.max(sMs, startMs));
    out.push({
      title: summary,
      date: dateFmt.format(shown),
      allDay: false,
      time: sMs < startMs ? null : timeFmt.format(shown),
      end: eMs > sMs ? timeFmt.format(new Date(eMs)) : null,
      location,
    });
  };

  for (const v of vevents) {
    if (v.hasProperty("recurrence-id")) continue;
    if (String(v.getFirstPropertyValue("status") ?? "").toUpperCase() === "CANCELLED") continue;
    const event = new ICAL.Event(v, { exceptions: exceptions.get(String(v.getFirstPropertyValue("uid"))) ?? [] });
    const summary = event.summary || "Без названия";
    const location = event.location || null;
    if (!event.isRecurring()) {
      if (event.startDate) push(summary, location, event.startDate, event.endDate ?? null);
      continue;
    }
    const it = event.iterator();
    for (let i = 0, next = it.next(); next && i < 20000; i++, next = it.next()) {
      if (toMs(next) >= endMs) break;
      const d = event.getOccurrenceDetails(next);
      if (String(d.item.component.getFirstPropertyValue("status") ?? "").toUpperCase() === "CANCELLED") continue;
      push(d.item.summary || summary, d.item.location || location, d.startDate, d.endDate);
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date) || Number(b.allDay) - Number(a.allDay) || (a.time ?? "").localeCompare(b.time ?? ""));
}

/** Секретный адрес Google: https://calendar.google.com/calendar/ical/…/private-…/basic.ics (или любой https-ICS). */
export function normalizeIcsUrl(raw: string): string | null {
  const s = raw.trim().replace(/^webcals?:\/\//i, "https://");
  try {
    const u = new URL(s);
    if (u.protocol !== "https:" || s.length > 1000) return null;
    return u.toString();
  } catch {
    return null;
  }
}
