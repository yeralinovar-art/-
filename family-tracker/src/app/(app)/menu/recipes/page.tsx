import Link from "next/link";
import { Plus } from "lucide-react";
import { getRecipes, photoUrls } from "@/lib/menu-data";
import { requireFamilySession } from "@/lib/session";
import { MenuHeader } from "../MenuHeader";
import { RecipeList } from "./RecipeList";

export const metadata = { title: "Рецепты — Семья" };

export default async function RecipesPage() {
  const [session, recipes] = await Promise.all([requireFamilySession(), getRecipes()]);
  const photos = await photoUrls(recipes.map((r) => r.photo_path));
  const items = recipes.map((r) => ({
    id: r.id,
    title: r.title,
    own: r.family_id !== null,
    kcal: r.perServing.kcal,
    minutes: r.cook_minutes,
    kidFriendly: r.kid_friendly,
    photo: r.photo_path ? (photos.get(r.photo_path) ?? null) : null,
  }));

  return (
    <>
      <MenuHeader profile={session.profile} subtitle="Наши и готовые рецепты" />
      <div className="flex flex-col gap-4">
        <Link
          href="/menu/recipes/new"
          className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-5 font-semibold text-accent-text active:scale-[0.98]"
        >
          <Plus className="size-5" aria-hidden />
          Новый рецепт
        </Link>
        <RecipeList items={items} />
      </div>
    </>
  );
}
