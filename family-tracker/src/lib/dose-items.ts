import "server-only";
import type { DoseItem } from "@/components/DoseList";
import { dueDoses, type Dose, type Medication } from "@/lib/meds";
import type { Child } from "@/lib/meds-data";
import type { Session } from "@/lib/session";
import { TIME_ZONE } from "@/lib/time";

/** Приёмы на дату в виде строк для DoseList: для кого, кто и когда отметил. */
export function toDoseItems(meds: Medication[], doses: Dose[], date: string, children: Child[], session: Session): DoseItem[] {
  const nameOf = (userId: string | null) =>
    userId === session.userId ? "вы" : userId === session.partner?.id ? session.partner.display_name : null;

  return dueDoses(meds, doses, date).map(({ med, slot, taken }) => {
    const time = taken
      ? new Intl.DateTimeFormat("ru-RU", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" }).format(new Date(taken.taken_at))
      : null;
    const by = taken ? nameOf(taken.taken_by) : null;
    return {
      key: `${med.id}-${slot}`,
      medicationId: med.id,
      slot,
      name: med.name,
      dose: med.dose,
      note: med.note,
      who: med.child_id ? (children.find((c) => c.id === med.child_id)?.name ?? "ребёнок") : null,
      takenLabel: taken ? `✓ ${time}${by && med.child_id ? `, ${by}` : ""}` : null,
    };
  });
}
