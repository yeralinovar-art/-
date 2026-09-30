import { ComingSoon } from "@/components/ComingSoon";
import { PageHeader } from "@/components/PageHeader";
import { requireFamilySession } from "@/lib/session";

export const metadata = { title: "Дела — Семья" };

export default async function TasksPage() {
  const { profile } = await requireFamilySession();
  return (
    <>
      <PageHeader title="Дела" subtitle="Работа, хобби и семья" profile={profile} />
      <ComingSoon
        items={[
          { title: "Личные задачи: сегодня, неделя, просрочено", stage: 4 },
          { title: "Общие задачи и семейные планы", stage: 4, shared: true },
          { title: "Проекты и таймер времени", stage: 4 },
          { title: "Цели и привычки с сериями", stage: 4 },
          { title: "Чтение: книги и таймер", stage: 4 },
          { title: "Задачи в Google Calendar", stage: 6 },
        ]}
      />
    </>
  );
}
