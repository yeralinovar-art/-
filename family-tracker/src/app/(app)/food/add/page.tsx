import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getHealthProfile, getRecentFoods, isMeal, mealByHour } from "@/lib/data";
import { isDate } from "@/lib/form";
import { requireFamilySession } from "@/lib/session";
import { TIME_ZONE, todayKey } from "@/lib/time";
import { aiEnabled } from "@/lib/ai";
import { AddFood } from "./AddFood";

export const metadata = { title: "Добавить еду — Семья" };
// AI-оценка еды обычно занимает несколько секунд.
export const maxDuration = 60;

export default async function AddFoodPage({ searchParams }: PageProps<"/food/add">) {
  const params = await searchParams;
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", hour12: false }).format(new Date()));
  const meal = isMeal(params.meal) ? params.meal : mealByHour(hour);
  const q = typeof params.q === "string" ? params.q.slice(0, 60) : "";
  const date = typeof params.date === "string" && isDate(params.date) ? params.date : todayKey();

  const [, health, recent] = await Promise.all([requireFamilySession(), getHealthProfile(), getRecentFoods()]);

  return (
    <>
      <header className="flex items-center gap-2 pt-4 pb-4">
        <Link
          href={date === todayKey() ? "/food" : `/food?date=${date}`}
          aria-label="Назад к дневнику"
          className="-ml-2 flex size-11 items-center justify-center rounded-full active:bg-card-muted"
        >
          <ChevronLeft className="size-6" aria-hidden />
        </Link>
        <h1 className="text-2xl font-bold">Добавить еду</h1>
      </header>
      <AddFood meal={meal} date={date} pregnant={health.is_pregnant} recent={recent} initialQuery={q} aiEnabled={aiEnabled()} initialTab={params.tab === "ai" ? "ai" : "search"} />
    </>
  );
}
