import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Clock, Pencil } from "lucide-react";
import { DoctorNote } from "@/components/DoctorNote";
import { Card, FamilyBadge, SubmitButton } from "@/components/ui";
import { getHealthProfile } from "@/lib/data";
import { pregnancyWarnings } from "@/lib/menu";
import { getRecipe, photoUrl } from "@/lib/menu-data";
import { requireFamilySession } from "@/lib/session";
import { copyRecipe, deleteRecipe } from "../../actions";
import { Ingredients } from "./Ingredients";

export default async function RecipePage({ params, searchParams }: PageProps<"/menu/recipes/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [, recipe, health] = await Promise.all([requireFamilySession(), getRecipe(id), getHealthProfile()]);
  if (!recipe) notFound();
  const photo = await photoUrl(recipe.photo_path);
  const own = recipe.family_id !== null;
  const wanted = Number(typeof sp.servings === "string" ? sp.servings.replace(",", ".") : NaN);
  const servings = Number.isFinite(wanted) && wanted >= 0.5 && wanted <= 30 ? wanted : recipe.servings;
  const warnings = health.is_pregnant ? pregnancyWarnings(recipe.ingredients) : [];
  const n = recipe.perServing;

  return (
    <>
      <header className="flex items-center justify-between gap-2 pt-4 pb-4">
        <Link
          href="/menu/recipes"
          aria-label="Назад к рецептам"
          className="-ml-2 flex size-11 items-center justify-center rounded-full active:bg-card-muted"
        >
          <ChevronLeft className="size-6" aria-hidden />
        </Link>
        {own && (
          <Link
            href={`/menu/recipes/${recipe.id}/edit`}
            className="flex min-h-10 items-center gap-1.5 rounded-full bg-card px-4 text-sm font-medium shadow-sm active:scale-95"
          >
            <Pencil className="size-4" aria-hidden />
            Изменить
          </Link>
        )}
      </header>

      <div className="flex flex-col gap-4">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element -- временная ссылка из хранилища
          <img src={photo} alt={recipe.title} className="aspect-[4/3] w-full rounded-3xl object-cover" />
        )}
        <div>
          <h1 className="text-[28px] leading-tight font-bold tracking-tight">{recipe.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
            {own ? <FamilyBadge label="Наш рецепт" /> : <span className="rounded-full bg-card-muted px-2 py-0.5 text-xs">Готовый рецепт</span>}
            {recipe.cook_minutes && (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-4" aria-hidden />
                {recipe.cook_minutes} мин
              </span>
            )}
            {recipe.kid_friendly ? <span>· детям можно</span> : <span>· детям — без острого</span>}
          </div>
        </div>

        <Card className="grid grid-cols-4 gap-2 text-center">
          {[
            ["ккал", n.kcal],
            ["белки", n.protein],
            ["жиры", n.fat],
            ["углев.", n.carbs],
          ].map(([label, v]) => (
            <div key={label}>
              <p className="text-lg font-semibold tabular-nums">{Number(v).toLocaleString("ru-RU", { maximumFractionDigits: 0 })}</p>
              <p className="text-xs text-muted">{label}</p>
            </div>
          ))}
          <p className="col-span-4 text-xs text-muted">на одну взрослую порцию · рецепт на {recipe.servings} порц.</p>
        </Card>

        {warnings.length > 0 && <DoctorNote>{warnings.join(". ")}.</DoctorNote>}

        <Link
          href={`/menu/add?recipe=${recipe.id}`}
          className="flex min-h-12 items-center justify-center rounded-2xl bg-accent px-5 font-semibold text-accent-text active:scale-[0.98]"
        >
          Добавить в меню
        </Link>

        <Ingredients ingredients={recipe.ingredients} baseServings={recipe.servings} initialServings={servings} />

        {recipe.steps && (
          <Card>
            <h2 className="mb-2 font-semibold">Как готовить</h2>
            <div className="flex flex-col gap-2 text-[15px] leading-relaxed whitespace-pre-line">{recipe.steps}</div>
          </Card>
        )}
        {recipe.note && <p className="px-2 text-sm text-muted">{recipe.note}</p>}

        {own ? (
          <form action={deleteRecipe}>
            <input type="hidden" name="id" value={recipe.id} />
            <SubmitButton variant="secondary" className="text-danger" pendingText="Удаляю…">
              Удалить рецепт
            </SubmitButton>
          </form>
        ) : (
          <form action={copyRecipe}>
            <input type="hidden" name="id" value={recipe.id} />
            <SubmitButton variant="secondary" pendingText="Копирую…">
              Скопировать в наши и изменить
            </SubmitButton>
          </form>
        )}
      </div>
    </>
  );
}
