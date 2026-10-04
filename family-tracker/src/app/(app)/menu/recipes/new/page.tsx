import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getFamilyServings } from "@/lib/menu-data";
import { requireFamilySession } from "@/lib/session";
import { RecipeForm } from "../RecipeForm";

export const metadata = { title: "Новый рецепт — Семья" };

export default async function NewRecipePage() {
  const [session, servings] = await Promise.all([requireFamilySession(), getFamilyServings()]);
  return (
    <>
      <header className="flex items-center gap-2 pt-4 pb-4">
        <Link href="/menu/recipes" aria-label="Назад к рецептам" className="-ml-2 flex size-11 items-center justify-center rounded-full active:bg-card-muted">
          <ChevronLeft className="size-6" aria-hidden />
        </Link>
        <h1 className="text-2xl font-bold">Новый рецепт</h1>
      </header>
      <RecipeForm
        familyId={session.family.id}
        values={{
          id: null,
          title: "",
          servings: Math.max(2, Math.ceil(servings)),
          cook_minutes: null,
          kid_friendly: true,
          steps: "",
          note: "",
          photo_path: null,
          photo_url: null,
          ingredients: [],
        }}
      />
    </>
  );
}
