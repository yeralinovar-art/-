"use client";

import { useActionState, useEffect, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Card, FormMessage, SubmitButton } from "@/components/ui";
import type { FormMessageState } from "@/lib/form";
import { amountLabel, DEPARTMENTS, type ShoppingItem } from "@/lib/menu";
import { createClient } from "@/lib/supabase/client";
import { addShoppingItem, clearCheckedShopping, deleteShoppingItem, toggleShoppingItem } from "../actions";

type Change = { type: "toggle"; id: string; checked: boolean } | { type: "delete"; id: string } | { type: "clear" };

export function ShoppingList({ items, familyId }: { items: ShoppingItem[]; familyId: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [list, apply] = useOptimistic(items, (state: ShoppingItem[], c: Change) => {
    if (c.type === "toggle") return state.map((i) => (i.id === c.id ? { ...i, checked: c.checked } : i));
    if (c.type === "delete") return state.filter((i) => i.id !== c.id);
    return state.filter((i) => !i.checked);
  });

  // Изменения от второго члена семьи приходят сразу (Supabase Realtime);
  // на случай обрыва — обновляем при возвращении в приложение.
  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 300);
    };
    const channel = supabase
      .channel(`shopping-${familyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "shopping_items", filter: `family_id=eq.${familyId}` }, refresh)
      .subscribe();
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [familyId, router]);

  function run(change: Change, fd: FormData, fn: (fd: FormData) => Promise<void>) {
    startTransition(async () => {
      apply(change);
      await fn(fd);
    });
  }
  const toggle = (item: ShoppingItem) => {
    const fd = new FormData();
    fd.set("id", item.id);
    fd.set("checked", item.checked ? "0" : "1");
    run({ type: "toggle", id: item.id, checked: !item.checked }, fd, toggleShoppingItem);
  };
  const remove = (item: ShoppingItem) => {
    const fd = new FormData();
    fd.set("id", item.id);
    run({ type: "delete", id: item.id }, fd, deleteShoppingItem);
  };

  const open = list.filter((i) => !i.checked);
  const done = list.filter((i) => i.checked);
  const groups = [...DEPARTMENTS, ...new Set(open.map((i) => i.department).filter((d) => !DEPARTMENTS.includes(d as never)))]
    .map((d) => ({ department: d, items: open.filter((i) => i.department === d) }))
    .filter((g) => g.items.length);

  return (
    <>
      <AddItem />
      {list.length === 0 && <p className="px-2 text-sm text-muted">Список пуст. Добавьте продукты или соберите их из меню недели.</p>}
      {groups.map((g) => (
        <Card key={g.department} className="py-2">
          <h2 className="pt-1 text-sm font-semibold text-muted">{g.department}</h2>
          <ul className="flex flex-col divide-y divide-line">
            {g.items.map((i) => (
              <Row key={i.id} item={i} onToggle={() => toggle(i)} onRemove={() => remove(i)} />
            ))}
          </ul>
        </Card>
      ))}
      {done.length > 0 && (
        <Card className="py-2">
          <div className="flex items-center justify-between pt-1">
            <h2 className="text-sm font-semibold text-muted">Куплено · {done.length}</h2>
            <button
              type="button"
              onClick={() => startTransition(async () => {
                apply({ type: "clear" });
                await clearCheckedShopping();
              })}
              className="min-h-9 text-sm font-medium text-accent"
            >
              Убрать купленное
            </button>
          </div>
          <ul className="flex flex-col divide-y divide-line">
            {done.map((i) => (
              <Row key={i.id} item={i} onToggle={() => toggle(i)} onRemove={() => remove(i)} />
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

function Row({ item, onToggle, onRemove }: { item: ShoppingItem; onToggle: () => void; onRemove: () => void }) {
  const amount = amountLabel(item.amount, item.unit);
  return (
    <li className="flex items-center gap-1">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={item.checked}
        aria-label={`${item.name}: ${item.checked ? "вернуть в список" : "купили"}`}
        className="flex min-h-12 flex-1 items-center gap-3 text-left"
      >
        <span
          className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition ${
            item.checked ? "border-accent bg-accent text-accent-text" : "border-line"
          }`}
        >
          {item.checked && <Check className="size-4" strokeWidth={3} aria-hidden />}
        </span>
        <span className={`min-w-0 flex-1 truncate ${item.checked ? "text-muted line-through" : ""}`}>{item.name}</span>
        {amount && <span className="shrink-0 text-sm text-muted tabular-nums">{amount}</span>}
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Удалить: ${item.name}`}
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted active:bg-card-muted"
      >
        <X className="size-4" aria-hidden />
      </button>
    </li>
  );
}

function AddItem() {
  const [state, action] = useActionState<FormMessageState, FormData>(addShoppingItem, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          name="name"
          aria-label="Что купить"
          placeholder="Что купить? Можно через запятую"
          maxLength={500}
          autoComplete="off"
          className="min-h-12 min-w-0 flex-1 rounded-2xl border border-line bg-card px-4 outline-none focus:border-accent"
        />
        <SubmitButton className="w-auto! shrink-0" pendingText="…">
          Добавить
        </SubmitButton>
      </div>
      {state.message?.type === "error" && <FormMessage message={state.message} />}
    </form>
  );
}
