import { BackHeader } from "@/components/BackHeader";
import { aiEnabled } from "@/lib/ai";
import { getHealthProfile, getLatestWeight } from "@/lib/data";
import { addDays, dailyKcalTarget } from "@/lib/health";
import { weekStartOf } from "@/lib/menu";
import { getFamilyServings } from "@/lib/menu-data";
import { requireFamilySession } from "@/lib/session";
import { todayKey } from "@/lib/time";
import { MenuAiForm } from "./MenuAiForm";

export const metadata = { title: "AI-меню — Семья" };
// Меню на неделю AI составляет 1–3 минуты.
export const maxDuration = 300;

export default async function MenuAiPage() {
  const today = todayKey();
  const [session, health, weight, servings] = await Promise.all([requireFamilySession(), getHealthProfile(), getLatestWeight(), getFamilyServings()]);
  const target = dailyKcalTarget(health, weight?.kg ?? null, today);
  const thisWeek = weekStartOf(today);

  return (
    <>
      <BackHeader href="/menu" title="✨ Меню на неделю" />
      {aiEnabled() ? (
        <MenuAiForm
          weeks={[
            { value: thisWeek, label: "Эта неделя (пустые места)" },
            { value: addDays(thisWeek, 7), label: "Следующая неделя" },
          ]}
          servings={servings}
          kcalMe={target?.kcal ?? null}
          partnerName={session.partner?.display_name ?? null}
          pregnant={health.is_pregnant}
        />
      ) : (
        <p className="rounded-2xl bg-card p-4 text-sm text-muted shadow-sm">
          AI-меню заработает, когда в настройках приложения появится ключ Claude API. Инструкция — в сообщении от разработчика и в README.
        </p>
      )}
    </>
  );
}
