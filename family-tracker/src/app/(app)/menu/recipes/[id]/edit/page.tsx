import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getRecipe, photoUrl } from "@/lib/menu-data";
import { requireFamilySession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { RecipeForm } from "../../RecipeForm";

export const metadata = { title: "Рецепт — Семья" };

export default async function EditRecipePage({ params }: PageProps<"/menu/recipes/[id]/edit">) {
  const { id } = await params;
  const [session, recipe] = await Promise.all([requireFamilySession(), getRecipe(id)]);
  // Готовые рецепты не меняем — их сначала копируют в семью.
  if (!recipe || recipe.family_id !== session.family.id) notFound();

  const foodIds = recipe.ingredients.map((i) => i.food_id).filter((v): v is string => Boolean(v));
  const supabase = await createClient();
  const [{ data: foods }, photo] = await Promise.all([
    foodIds.length
      ? supabase.from("foods").select("id, kcal_100, portion_g, portion_label").in("id", foodIds)
      : Promise.resolve({ data: [] as { id: string; kcal_100: number; portion_g: number; portion_label: string | null }[] }),
    photoUrl(recipe.photo_path),
  ]);
  const byId = new Map((foods ?? []).map((f) => [f.id, f]));

  return (
    <>
      <header className="flex items-center gap-2 pt-4 pb-4">
        <Link href={`/menu/recipes/${recipe.id}`} aria-label="Назад к рецепту" className="-ml-2 flex size-11 items-center justify-center rounded-full active:bg-card-muted">
          <ChevronLeft className="size-6" aria-hidden />
        </Link>
        <h1 className="text-2xl font-bold">Изменить рецепт</h1>
      </header>
      <RecipeForm
        familyId={session.family.id}
        values={{
          id: recipe.id,
          title: recipe.title,
          servings: recipe.servings,
          cook_minutes: recipe.cook_minutes,
          kid_friendly: recipe.kid_friendly,
          steps: recipe.steps ?? "",
          note: recipe.note ?? "",
          photo_path: recipe.photo_path,
          photo_url: photo,
          ingredients: recipe.ingredients.map((i) => {
            const f = i.food_id ? byId.get(i.food_id) : undefined;
            return {
              key: i.id,
              food_id: i.food_id,
              name: i.name,
              amount: i.amount === null ? "" : String(i.amount).replace(".", ","),
              unit: i.unit,
              kcalPerGram: f ? Number(f.kcal_100) / 100 : null,
              gramsPerPiece: f && (i.unit === "шт" || f.portion_label?.startsWith("1 ")) ? Number(f.portion_g) : null,
            };
          }),
        }}
      />
    </>
  );
}
