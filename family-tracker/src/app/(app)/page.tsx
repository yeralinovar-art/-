import Link from "next/link";
import { ComingSoon } from "@/components/ComingSoon";
import { PageHeader } from "@/components/PageHeader";
import { Card, FamilyBadge } from "@/components/ui";
import { requireFamilySession } from "@/lib/session";
import { formatLongDate, greeting } from "@/lib/time";

export default async function TodayPage() {
  const { profile, family, partner } = await requireFamilySession();

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${profile.display_name}`}
        subtitle={formatLongDate()}
        profile={profile}
      />

      <div className="flex flex-col gap-4">
        <Card className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <h2 className="truncate font-semibold">{family.name}</h2>
              <FamilyBadge label="Семья" />
            </div>
            {partner ? (
              <p className="text-sm text-muted">
                Вы и {partner.avatar_emoji} {partner.display_name}
              </p>
            ) : (
              <p className="text-sm text-muted">Партнёр ещё не присоединился</p>
            )}
          </div>
          {!partner && (
            <Link
              href="/profile"
              className="shrink-0 rounded-2xl bg-family-soft px-4 py-2.5 text-sm font-semibold text-family"
            >
              Пригласить
            </Link>
          )}
        </Card>

        <ComingSoon
          items={[
            { title: "Калории: съедено / сожжено / осталось", stage: 2 },
            { title: "Вес сегодня", stage: 2 },
            { title: "Задачи на сегодня и привычки", stage: 4 },
            { title: "Цитата дня", stage: 4, shared: true },
            { title: "Мини-тренировка дня", stage: 4, shared: true },
            { title: "Таймер чтения", stage: 4 },
            { title: "Шаги и события календаря", stage: 6 },
          ]}
        />
      </div>
    </>
  );
}
