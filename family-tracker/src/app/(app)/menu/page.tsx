import { ComingSoon } from "@/components/ComingSoon";
import { PageHeader } from "@/components/PageHeader";
import { FamilyBadge } from "@/components/ui";
import { requireFamilySession } from "@/lib/session";

export const metadata = { title: "Меню — Семья" };

export default async function MenuPage() {
  const { profile } = await requireFamilySession();
  return (
    <>
      <PageHeader title="Меню" subtitle="На неделю" profile={profile} badge={<FamilyBadge />} />
      <ComingSoon
        items={[
          { title: "Недельный планер", stage: 3, shared: true },
          { title: "Рецепты с ккал на порцию", stage: 3, shared: true },
          { title: "Список покупок в реальном времени", stage: 3, shared: true },
          { title: "AI-меню на неделю одной кнопкой", stage: 5, shared: true },
        ]}
      />
    </>
  );
}
