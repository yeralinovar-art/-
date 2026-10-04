import { PageHeader } from "@/components/PageHeader";
import { getHealthProfile } from "@/lib/data";
import { bmi, fmt, iomTotalGain } from "@/lib/health";
import { requireFamilySession } from "@/lib/session";
import { HealthForm } from "./HealthForm";

export const metadata = { title: "Здоровье и цели — Семья" };

export default async function HealthPage() {
  const [{ profile }, health] = await Promise.all([requireFamilySession(), getHealthProfile()]);

  let iomHint: string | null = null;
  if (health.pre_pregnancy_weight_kg && health.height_cm) {
    const b = bmi(health.pre_pregnancy_weight_kg, health.height_cm);
    const g = iomTotalGain(b);
    iomHint = `ИМТ до беременности ${b.toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}, по нормам IOM: ${fmt(g.min)}–${fmt(g.max)} кг. Пусто — используем их.`;
  }

  return (
    <>
      <PageHeader title="Здоровье и цели" subtitle="Видно только вам" profile={profile} />
      <HealthForm profile={health} iomHint={iomHint} />
    </>
  );
}
