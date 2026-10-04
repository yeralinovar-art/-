// Расписание витаминов и лекарств. Чистые функции — проверяются в meds.test.ts.

export type Medication = {
  id: string;
  owner_id: string | null;
  child_id: string | null;
  name: string;
  dose: string | null;
  times: string[];
  weekdays: number[] | null;
  note: string | null;
  start_date: string;
  end_date: string | null;
  archived: boolean;
};

export type Dose = { medication_id: string; dose_date: string; slot: string; taken_at: string; taken_by: string | null };

export type DueDose = {
  med: Medication;
  slot: string;
  taken: Dose | null;
};

export const WEEKDAYS = [
  { value: 1, short: "Пн" },
  { value: 2, short: "Вт" },
  { value: 3, short: "Ср" },
  { value: 4, short: "Чт" },
  { value: 5, short: "Пт" },
  { value: 6, short: "Сб" },
  { value: 7, short: "Вс" },
];

/** День недели ISO (1 = пн … 7 = вс) для даты YYYY-MM-DD. */
export function isoWeekday(date: string): number {
  const d = new Date(`${date}T12:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

export function isDueOn(med: Medication, date: string): boolean {
  if (med.archived) return false;
  if (date < med.start_date) return false;
  if (med.end_date && date > med.end_date) return false;
  return !med.weekdays || med.weekdays.includes(isoWeekday(date));
}

/** Все приёмы на дату, по времени; с отметкой, если уже приняли. */
export function dueDoses(meds: Medication[], doses: Dose[], date: string): DueDose[] {
  const out: DueDose[] = [];
  for (const med of meds) {
    if (!isDueOn(med, date)) continue;
    for (const slot of [...med.times].sort()) {
      const taken = doses.find((d) => d.medication_id === med.id && d.dose_date === date && d.slot === slot) ?? null;
      out.push({ med, slot, taken });
    }
  }
  return out.sort((a, b) => a.slot.localeCompare(b.slot) || a.med.name.localeCompare(b.med.name, "ru"));
}

/** «каждый день», «по воскресеньям», «пн, ср, пт». */
export function scheduleLabel(med: Pick<Medication, "times" | "weekdays">): string {
  const times = [...med.times].sort().join(", ");
  if (!med.weekdays || med.weekdays.length === 7) return `каждый день · ${times}`;
  if (med.weekdays.length === 1) {
    const names = ["", "понедельникам", "вторникам", "средам", "четвергам", "пятницам", "субботам", "воскресеньям"];
    return `по ${names[med.weekdays[0]]} · ${times}`;
  }
  const days = WEEKDAYS.filter((d) => med.weekdays?.includes(d.value)).map((d) => d.short.toLowerCase());
  return `${days.join(", ")} · ${times}`;
}

/** Проверка и нормализация времени «8:00» → «08:00». */
export function normalizeTime(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2})[:.](\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}
