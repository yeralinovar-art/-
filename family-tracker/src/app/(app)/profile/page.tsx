import Link from "next/link";
import { ChevronRight, HeartPulse, LogOut, PlusSquare, Share } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { PageHeader } from "@/components/PageHeader";
import { Card, FamilyBadge } from "@/components/ui";
import { requireFamilySession } from "@/lib/session";
import { InviteCode } from "./InviteCode";
import { ProfileForm } from "./ProfileForm";

export const metadata = { title: "Профиль — Семья" };

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const { profile, family, partner, email } = await requireFamilySession();
  const { welcome } = await searchParams;

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

        <ProfileForm
          displayName={profile.display_name}
          avatarEmoji={profile.avatar_emoji}
          familyName={family.name}
        />

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

        <form action={signOut}>
          <button
            type="submit"
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-card font-semibold text-danger shadow-sm active:scale-[0.98]"
          >
            <LogOut className="size-5" aria-hidden />
            Выйти
          </button>
        </form>
      </div>
    </>
  );
}
