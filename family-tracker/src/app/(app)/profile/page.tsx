import Link from "next/link";
import { Activity, Bell, CalendarDays, ChevronRight, HeartPulse, PlusSquare, Share } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { SignOutButton } from "@/components/SignOutButton";
import { Card, FamilyBadge } from "@/components/ui";
import { requireFamilySession } from "@/lib/session";
import { cookies } from "next/headers";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";
import { InviteCode } from "./InviteCode";
import { ThemePicker } from "./ThemePicker";
import { ProfileForm } from "./ProfileForm";

export const metadata = { title: "Профиль — Семья" };

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const { profile, family, partner, email } = await requireFamilySession();
  const { welcome } = await searchParams;
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <>
      <PageHeader title="Профиль" subtitle={email} profile={profile} />

      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Семья</h2>
            <FamilyBadge label={family.name} />
          </div>
          {partner ? (
            <p className="text-muted">
              В семье вы и {partner.avatar_emoji} {partner.display_name}. Меню, покупки и общие
              задачи у вас общие, личные данные каждый видит только свои.
            </p>
          ) : (
            <>
              <p className="text-muted">
                {welcome ? "Семья создана! " : ""}Отправьте этот код партнёру: пусть зарегистрируется
                и введёт его на экране «Семья».
              </p>
              <InviteCode code={family.invite_code} />
            </>
          )}
        </Card>

        <Link href="/profile/health" className="block active:opacity-90">
          <Card className="flex items-center gap-3">
            <HeartPulse className="size-6 shrink-0 text-accent" aria-hidden />
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">Здоровье и цели</h2>
              <p className="text-sm text-muted">Рост, активность, беременность, норма калорий. Видно только вам.</p>
            </div>
            <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
          </Card>
        </Link>

        <Link href="/profile/apple-health" className="block active:opacity-90">
          <Card className="flex items-center gap-3">
            <Activity className="size-6 shrink-0 text-accent" aria-hidden />
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">Apple Health</h2>
              <p className="text-sm text-muted">Шаги, калории и вес с iPhone — каждый вечер сами.</p>
            </div>
            <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
          </Card>
        </Link>

        <Link href="/profile/notifications" className="block active:opacity-90">
          <Card className="flex items-center gap-3">
            <Bell className="size-6 shrink-0 text-accent" aria-hidden />
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">Напоминания</h2>
              <p className="text-sm text-muted">Витамины, дела, врачи — уведомлением на телефон.</p>
            </div>
            <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
          </Card>
        </Link>

        <Link href="/profile/calendar" className="block active:opacity-90">
          <Card className="flex items-center gap-3">
            <CalendarDays className="size-6 shrink-0 text-accent" aria-hidden />
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">Календарь</h2>
              <p className="text-sm text-muted">Дела — в календарь iPhone или Google, события Google — на «Сегодня».</p>
            </div>
            <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
          </Card>
        </Link>

        <ProfileForm
          displayName={profile.display_name}
          avatarEmoji={profile.avatar_emoji}
          familyName={family.name}
        />

        <Card className="flex flex-col gap-3">
          <h2 className="font-semibold">Оформление</h2>
          <ThemePicker current={theme} />
        </Card>

        <Card className="flex flex-col gap-2">
          <h2 className="font-semibold">Установить на iPhone</h2>
          <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-muted">
            <li>Откройте приложение в Safari.</li>
            <li>
              Нажмите <Share className="inline size-4 align-[-2px]" aria-label="Поделиться" /> внизу
              экрана.
            </li>
            <li>
              Выберите <PlusSquare className="inline size-4 align-[-2px]" aria-hidden /> «На экран
              „Домой“» и нажмите «Добавить».
            </li>
          </ol>
          <p className="text-sm text-muted">На Android: меню Chrome ⋮ → «Установить приложение».</p>
        </Card>

        <SignOutButton />
      </div>
    </>
  );
}
