import { ComingSoon } from "@/components/ComingSoon";
import { PageHeader } from "@/components/PageHeader";
import { requireFamilySession } from "@/lib/session";

export const metadata = { title: "Прогресс — Семья" };

export default async function ProgressPage() {
  const { profile } = await requireFamilySession();
  return (
    <>
      <PageHeader title="Прогресс" subtitle="Графики" profile={profile} />
      <ComingSoon
        items={[
          { title: "Вес со скользящим средним за 7 дней", stage: 2 },
          { title: "Калории по дням", stage: 2 },
          { title: "Активность и тренировки", stage: 4 },
          { title: "Время по проектам", stage: 4 },
        ]}
      />
    </>
  );
}
