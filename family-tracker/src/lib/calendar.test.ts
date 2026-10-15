import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIcs, eventsInRange, foldLine, normalizeIcsUrl, type FeedEvent } from "./calendar.ts";

const GOOGLE = [
  "BEGIN:VCALENDAR",
  "PRODID:-//Google Inc//Google Calendar 70.9054//EN",
  "VERSION:2.0",
  "X-WR-TIMEZONE:Asia/Almaty",
  "BEGIN:VTIMEZONE",
  "TZID:Asia/Almaty",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0500",
  "TZOFFSETTO:+0500",
  "TZNAME:GMT+5",
  "DTSTART:19700101T000000",
  "END:STANDARD",
  "END:VTIMEZONE",
  // Разовое событие сегодня в 10:00 по Алматы
  "BEGIN:VEVENT",
  "DTSTART;TZID=Asia/Almaty:20261015T100000",
  "DTEND;TZID=Asia/Almaty:20261015T110000",
  "UID:one@google.com",
  "SUMMARY:Созвон\\, работа",
  "LOCATION:Zoom",
  "END:VEVENT",
  // Еженедельно по четвергам в 18:30 с 1 октября; 22-е отменено, 29-е перенесено на 19:00
  "BEGIN:VEVENT",
  "DTSTART;TZID=Asia/Almaty:20261001T183000",
  "DTEND;TZID=Asia/Almaty:20261001T193000",
  "RRULE:FREQ=WEEKLY;BYDAY=TH",
  "EXDATE;TZID=Asia/Almaty:20261022T183000",
  "UID:yoga@google.com",
  "SUMMARY:Йога",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;TZID=Asia/Almaty:20261029T190000",
  "DTEND;TZID=Asia/Almaty:20261029T200000",
  "RECURRENCE-ID;TZID=Asia/Almaty:20261029T183000",
  "UID:yoga@google.com",
  "SUMMARY:Йога (перенос)",
  "END:VEVENT",
  // Весь день, 3 дня: 14–16 октября
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20261014",
  "DTEND;VALUE=DATE:20261017",
  "UID:trip@google.com",
  "SUMMARY:Бабушка в гостях",
  "END:VEVENT",
  // Отменённое
  "BEGIN:VEVENT",
  "DTSTART:20261015T050000Z",
  "DTEND:20261015T060000Z",
  "UID:cancel@google.com",
  "STATUS:CANCELLED",
  "SUMMARY:Отменено",
  "END:VEVENT",
  // В UTC: 15 окт 20:00Z = 16 окт 01:00 по Алматы — уже завтра
  "BEGIN:VEVENT",
  "DTSTART:20261015T200000Z",
  "DTEND:20261015T210000Z",
  "UID:night@google.com",
  "SUMMARY:Ночной рейс",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

test("eventsInRange: сегодня (четверг 15 октября)", () => {
  const ev = eventsInRange(GOOGLE, "2026-10-15", 1);
  assert.deepEqual(
    ev.map((e) => [e.date, e.time, e.title]),
    [
      ["2026-10-15", null, "Бабушка в гостях"],
      ["2026-10-15", "10:00", "Созвон, работа"],
      ["2026-10-15", "18:30", "Йога"],
    ],
  );
  assert.equal(ev[1].location, "Zoom");
  assert.equal(ev[1].end, "11:00");
});

test("eventsInRange: завтра — ночной рейс по Алматы и последний день гостей", () => {
  const ev = eventsInRange(GOOGLE, "2026-10-16", 1);
  assert.deepEqual(ev.map((e) => [e.time, e.title]), [[null, "Бабушка в гостях"], ["01:00", "Ночной рейс"]]);
});

test("eventsInRange: исключения повторов", () => {
  assert.deepEqual(eventsInRange(GOOGLE, "2026-10-22", 1), []);
  assert.deepEqual(eventsInRange(GOOGLE, "2026-10-29", 1).map((e) => [e.time, e.title]), [["19:00", "Йога (перенос)"]]);
  assert.equal(eventsInRange(GOOGLE, "2026-11-05", 1)[0].title, "Йога");
});

test("buildIcs: события на день и со временем, экранирование, перенос строк", () => {
  const events: FeedEvent[] = [
    { uid: "task-1", kind: "task", date: "2026-10-20", title: "Оплатить интернет; срочно", shared: true },
    { uid: "visit-2", kind: "visit", date: "2026-10-21", time: "14:30", title: "Педиатр", child: "Айша", place: "Клиника, каб. 5" },
    { uid: "vaccine-3", kind: "vaccine", date: "2026-11-01", title: "АКДС", child: "Айша" },
    { uid: "plan-4", kind: "plan", date: "2026-12-31", title: "Новый год", emoji: "🎄" },
  ];
  const ics = buildIcs(events, { name: "Семья", url: "https://semya.example/tasks", now: new Date("2026-10-15T00:00:00Z") });
  assert.match(ics, /DTSTART;VALUE=DATE:20261020\r\nDTEND;VALUE=DATE:20261021/);
  assert.match(ics, /DTSTART:20261021T093000Z\r\nDTEND:20261021T103000Z/);
  assert.match(ics, /SUMMARY:📌 Оплатить интернет\\; срочно/);
  assert.match(ics, /LOCATION:Клиника\\, каб. 5/);
  assert.match(ics, /SUMMARY:💉 Прививка: АКДС — Айша/);
  assert.match(ics, /SUMMARY:🎄 Новый год/);
  for (const line of ics.split("\r\n")) assert.ok(new TextEncoder().encode(line).length <= 75, line);
  // Наш собственный файл читается нашим же разборщиком
  const back = eventsInRange(ics, "2026-10-21", 1);
  assert.deepEqual(back.map((e) => [e.time, e.title]), [["14:30", "🩺 Педиатр — Айша"]]);
});

test("foldLine не режет многобайтовые символы", () => {
  const long = "SUMMARY:" + "ё".repeat(100);
  const folded = foldLine(long);
  assert.equal(folded.replace(/\r\n /g, ""), long);
});

test("eventsInRange: пояс без описания и «плавающее» время — по Алматы", () => {
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "UID:a",
    "DTSTART;TZID=Asia/Almaty:20261015T090000",
    "DTEND;TZID=Asia/Almaty:20261015T100000",
    "SUMMARY:Планёрка",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:b",
    "DTSTART:20261015T233000",
    "SUMMARY:Поздно",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  assert.deepEqual(eventsInRange(ics, "2026-10-15", 1).map((e) => [e.time, e.end, e.title]), [
    ["09:00", "10:00", "Планёрка"],
    ["23:30", null, "Поздно"],
  ]);
});

test("normalizeIcsUrl", () => {
  assert.equal(normalizeIcsUrl(" webcal://p01-calendars.icloud.com/x "), "https://p01-calendars.icloud.com/x");
  assert.equal(normalizeIcsUrl("http://example.com/a.ics"), null);
  assert.equal(normalizeIcsUrl("не ссылка"), null);
});
