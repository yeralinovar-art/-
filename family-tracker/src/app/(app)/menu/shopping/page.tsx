import { Card, SubmitButton } from "@/components/ui";
import { weekStartOf } from "@/lib/menu";
import { getShopping } from "@/lib/menu-data";
import { requireFamilySession } from "@/lib/session";
import { todayKey } from "@/lib/time";
import { buildShoppingFromMenu } from "../actions";
import { MenuHeader } from "../MenuHeader";
import { ShoppingList } from "./ShoppingList";

export const metadata = { title: "Покупки — Семья" };

export default async function ShoppingPage({ searchParams }: PageProps<"/menu/shopping">) {
  const params = await searchParams;
  const [session, items] = await Promise.all([requireFamilySession(), getShopping()]);
  const built = typeof params.built === "string" ? Number(params.built) : null;

  return (
    <>
      <MenuHeader profile={session.profile} subtitle="Отмечайте в магазине — у второго обновится сразу" />
      <div className="flex flex-col gap-4">
        {built !== null && Number.isFinite(built) && (
          <p role="status" className="rounded-2xl bg-accent-soft px-4 py-3 text-sm text-accent">
            {built > 0 ? `Из меню добавлено продуктов: ${built}` : "Новых продуктов из меню нет — всё уже в списке"}
          </p>
        )}
        <ShoppingList items={items} familyId={session.family.id} />
        <Card className="flex flex-col gap-2">
          <p className="text-sm text-muted">
            Список из меню недели: продукты всех блюд складываются, количество — с учётом порций. Купленное и добавленное
            вручную не трогаем.
          </p>
          <form action={buildShoppingFromMenu}>
            <input type="hidden" name="week" value={weekStartOf(todayKey())} />
            <SubmitButton variant="secondary" pendingText="Собираю…">
              Собрать из меню этой недели
            </SubmitButton>
          </form>
        </Card>
      </div>
    </>
  );
}
