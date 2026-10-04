import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { isMeal, mealByHour } from "@/lib/data";
import { isDate } from "@/lib/form";
import { weekStartOf } from "@/lib/menu";
import { getFamilyServings, getRecipes } from "@/lib/menu-data";
import { requireFamilySession } from "@/lib/session";
import { TIME_ZONE, todayKey } from "@/lib/time";
import { AddToPlan } from "./AddToPlan";

export const metadata = { title: "Добавить в меню — Семья" };

export default async function AddToMenuPage({ searchParams }: PageProps<"/menu/add">) {
  const params = await searchParams;
  const today = todayKey();
  const date = typeof params.date === "string" && isDate(params.date) ? params.date : today;
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", hour12: false }).format(new Date()));
  const meal = isMeal(params.meal) ? params.meal : date === today ? mealByHour(hour) : "lunch";
  const recipeId = typeof params.recipe === "string" ? params.recipe : null;
  const [, recipes, servings] = await Promise.all([requireFamilySession(), getRecipes(), getFamilyServings()]);

  return (
    <>
      <header className="flex items-center gap-2 pt-4 pb-4">
        <Link
          href={`/menu?week=${weekStartOf(date)}`}
          aria-label="Назад к меню"
          className="-ml-2 flex size-11 items-center justify-center rounded-full active:bg-card-muted"
        >
          <ChevronLeft className="size-6" aria-hidden />
        </Link>
        <h1 className="text-2xl font-bold">Добавить в меню</h1>
      </header>
      <AddToPlan
        date={date}
        meal={meal}
        servings={servings}
        recipes={recipes.map((r) => ({ id: r.id, title: r.title, kcal: r.perServing.kcal, own: r.family_id !== null, minutes: r.cook_minutes }))}
        initialRecipe={recipes.some((r) => r.id === recipeId) ? recipeId : null}
      />
    </>
  );
}
