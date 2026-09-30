import { ComingSoon } from "@/components/ComingSoon";
import { PageHeader } from "@/components/PageHeader";
import { requireFamilySession } from "@/lib/session";

export const metadata = { title: "Питание — Семья" };

export default async function FoodPage() {
  const { profile } = await requireFamilySession();
  return (
    <>
      <PageHeader title="Питание" subtitle="Мой дневник" profile={profile} />
      <ComingSoon
        items={[
          { title: "Дневник: завтрак, обед, ужин, перекусы", stage: 2 },
          { title: "Поиск продуктов и своя база блюд", stage: 2 },
          { title: "Сканер штрихкода", stage: 2 },
          { title: "Норма ккал и КБЖУ, вода", stage: 2 },
          { title: "Ввод текстом и по фото (AI)", stage: 5 },
        ]}
      />
    </>
  );
}
