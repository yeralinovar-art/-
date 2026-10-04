"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { Plus, ScanBarcode, Search, X } from "lucide-react";
import { FormMessage, NumberField, SubmitButton, TextField } from "@/components/ui";
import type { Food, FoodEntry, Meal } from "@/lib/data";
import type { FormMessageState } from "@/lib/form";
import { addFromFood, addQuick, createFoodAndAdd } from "../actions";
import { BarcodeScanner } from "./BarcodeScanner";

type Recent = Omit<FoodEntry, "id" | "entry_date" | "meal">;
type Tab = "search" | "quick" | "own" | "barcode";

const MEAL_OPTIONS: { value: Meal; label: string }[] = [
  { value: "breakfast", label: "Завтрак" },
  { value: "lunch", label: "Обед" },
  { value: "dinner", label: "Ужин" },
  { value: "snack", label: "Перекус" },
];

const r0 = (n: number) => Math.round(n);
const fmt = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 1 });

export function AddFood({
  meal: initialMeal,
  date,
  pregnant,
  recent,
}: {
  meal: Meal;
  date: string;
  pregnant: boolean;
  recent: Recent[];
}) {
  const [meal, setMeal] = useState<Meal>(initialMeal);
  const [tab, setTab] = useState<Tab>("search");
  const [selected, setSelected] = useState<Food | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-1 rounded-2xl bg-card-muted p-1">
        {MEAL_OPTIONS.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => setMeal(m.value)}
            aria-pressed={meal === m.value}
            className={`min-h-10 rounded-xl text-sm font-medium transition ${meal === m.value ? "bg-card shadow-sm" : "text-muted"}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(
          [
            ["search", "Поиск"],
            ["quick", "Быстро"],
            ["own", "Своё блюдо"],
            ["barcode", "Штрихкод"],
          ] as [Tab, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-medium transition ${
              tab === value ? "bg-accent text-accent-text" : "bg-card text-text shadow-sm"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "search" && <SearchTab meal={meal} date={date} recent={recent} onSelect={setSelected} />}
      {tab === "quick" && <QuickTab meal={meal} date={date} />}
      {tab === "own" && <OwnTab meal={meal} date={date} />}
      {tab === "barcode" && <BarcodeTab onFound={setSelected} />}

      {selected && (
        <PortionSheet food={selected} meal={meal} date={date} pregnant={pregnant} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function SearchTab({
  meal,
  date,
  recent,
  onSelect,
}: {
  meal: Meal;
  date: string;
  recent: Recent[];
  onSelect: (f: Food) => void;
}) {
  const [q, setQ] = useState("");
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const query = q.trim();
    if (!query) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/foods?q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
        if (res.ok) setFoods((await res.json()).foods);
      } catch {
        // запрос отменён новым вводом
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const searching = q.trim().length > 0;

  return (
    <div className="flex flex-col gap-3">
      <label className="relative flex items-center">
        <Search className="pointer-events-none absolute left-4 size-5 text-muted" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Плов, яблоко, творог…"
          aria-label="Поиск продукта"
          className="min-h-12 w-full rounded-2xl border border-line bg-card pr-4 pl-12 outline-none focus:border-accent"
        />
      </label>

      {searching ? (
        <ul className="flex flex-col divide-y divide-line rounded-3xl bg-card px-4 shadow-sm">
          {foods.map((f) => (
            <li key={f.id}>
              <button type="button" onClick={() => onSelect(f)} className="flex w-full items-center justify-between gap-3 py-3 text-left">
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {f.name}
                    {f.family_id && <span className="ml-1.5 inline-block size-2 rounded-full bg-family align-middle" aria-label="блюдо семьи" />}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {f.brand ? `${f.brand} · ` : ""}
                    {fmt(f.kcal_100)} ккал / 100 {f.unit}
                  </span>
                </span>
                <Plus className="size-5 shrink-0 text-accent" aria-hidden />
              </button>
            </li>
          ))}
          {!loading && foods.length === 0 && (
            <li className="py-4 text-sm text-muted">
              Ничего не нашлось. Попробуйте «Быстро» или «Своё блюдо».
            </li>
          )}
        </ul>
      ) : (
        recent.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="px-1 text-sm font-medium text-muted">Недавние — добавить в одно касание</h2>
            <ul className="flex flex-col divide-y divide-line rounded-3xl bg-card px-4 shadow-sm">
              {recent.map((r) => (
                <li key={`${r.name}|${r.grams}`}>
                  <RecentRow item={r} meal={meal} date={date} />
                </li>
              ))}
            </ul>
          </section>
        )
      )}
    </div>
  );
}

function RecentRow({ item, meal, date }: { item: Recent; meal: Meal; date: string }) {
  const [state, action] = useActionState<FormMessageState, FormData>(addQuick, {});
  return (
    <form action={action} className="flex items-center justify-between gap-3 py-3">
      {Object.entries({
        meal,
        date,
        name: item.name,
        grams: item.grams ?? "",
        unit: item.unit,
        kcal: item.kcal,
        protein: item.protein,
        fat: item.fat,
        carbs: item.carbs,
        caffeine_mg: item.caffeine_mg,
      }).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={String(v)} />
      ))}
      <span className="min-w-0">
        <span className="block truncate font-medium">{item.name}</span>
        <span className="block text-xs text-muted">
          {item.grams ? `${fmt(item.grams)} ${item.unit} · ` : ""}
          {r0(item.kcal)} ккал
        </span>
        {state.message && <span className="block text-xs text-danger">{state.message.text}</span>}
      </span>
      <AddIconButton />
    </form>
  );
}

function AddIconButton() {
  return (
    <SubmitButton
      pendingText="…"
      aria-label="Добавить"
      className="min-h-10! w-10! shrink-0 rounded-full! px-0!"
    >
      <Plus className="mx-auto size-5" aria-hidden />
    </SubmitButton>
  );
}

function PortionSheet({
  food,
  meal,
  date,
  pregnant,
  onClose,
}: {
  food: Food;
  meal: Meal;
  date: string;
  pregnant: boolean;
  onClose: () => void;
}) {
  const [state, action] = useActionState<FormMessageState, FormData>(addFromFood, {});
  const [grams, setGrams] = useState(String(food.portion_g).replace(".", ","));
  const g = Number(grams.replace(",", ".")) || 0;
  const k = g / 100;
  const chips: [string, number][] = [
    [food.portion_label ? `${food.portion_label}` : "порция", food.portion_g],
    ["½", food.portion_g / 2],
    ["×2", food.portion_g * 2],
    [`100 ${food.unit}`, 100],
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-end" role="dialog" aria-modal="true" aria-label={food.name}>
      <button type="button" aria-label="Закрыть" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form action={action} className="pb-safe relative mx-auto flex w-full max-w-md flex-col gap-4 rounded-t-3xl bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{food.name}</h2>
            <p className="text-sm text-muted">
              {food.brand ? `${food.brand} · ` : ""}
              {fmt(food.kcal_100)} ккал на 100 {food.unit}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Закрыть" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card-muted">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {pregnant && food.pregnancy_warning && (
          <p className="rounded-2xl bg-family-soft px-4 py-3 text-sm text-family">При беременности: {food.pregnancy_warning}</p>
        )}

        <input type="hidden" name="food_id" value={food.id} />
        <input type="hidden" name="meal" value={meal} />
        <input type="hidden" name="date" value={date} />
        <NumberField label="Порция" name="grams" suffix={food.unit} value={grams} onChange={(e) => setGrams(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          {chips.map(([label, value]) => (
            <button
              key={label}
              type="button"
              onClick={() => setGrams(String(Math.round(value)))}
              className="min-h-9 rounded-full bg-card-muted px-3.5 text-sm"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-2 rounded-2xl bg-card-muted p-3 text-center">
          <Stat label="ккал" value={r0(food.kcal_100 * k)} strong />
          <Stat label="белки" value={fmt(food.protein_100 * k)} />
          <Stat label="жиры" value={fmt(food.fat_100 * k)} />
          <Stat label="углев." value={fmt(food.carbs_100 * k)} />
        </div>
        {food.caffeine_100 > 0 && <p className="text-sm text-muted">Кофеин: {r0(food.caffeine_100 * k)} мг</p>}

        <FormMessage message={state.message} />
        <SubmitButton>Добавить</SubmitButton>
      </form>
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: string | number; strong?: boolean }) {
  return (
    <div>
      <p className={strong ? "text-lg font-bold" : "font-semibold"}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function QuickTab({ meal, date }: { meal: Meal; date: string }) {
  const [state, action] = useActionState<FormMessageState, FormData>(addQuick, {});
  return (
    <form action={action} className="flex flex-col gap-4 rounded-3xl bg-card p-4 shadow-sm">
      <input type="hidden" name="meal" value={meal} />
      <input type="hidden" name="date" value={date} />
      <TextField label="Что ели" name="name" placeholder="Например: обед в кафе" maxLength={120} />
      <NumberField label="Калории" name="kcal" suffix="ккал" required autoFocus />
      <div className="grid grid-cols-3 gap-3">
        <NumberField label="Белки" name="protein" suffix="г" />
        <NumberField label="Жиры" name="fat" suffix="г" />
        <NumberField label="Углев." name="carbs" suffix="г" />
      </div>
      <NumberField label="Кофеин, если есть" name="caffeine_mg" suffix="мг" hint="Чашка кофе — около 80–100 мг, чай — 40–50 мг" />
      <FormMessage message={state.message} />
      <SubmitButton>Добавить</SubmitButton>
    </form>
  );
}

function OwnTab({ meal, date }: { meal: Meal; date: string }) {
  const [state, action] = useActionState<FormMessageState, FormData>(createFoodAndAdd, {});
  return (
    <form action={action} className="flex flex-col gap-4 rounded-3xl bg-card p-4 shadow-sm">
      <p className="text-sm text-muted">Блюдо сохранится в справочник семьи — в следующий раз найдёте его поиском.</p>
      <input type="hidden" name="meal" value={meal} />
      <input type="hidden" name="date" value={date} />
      <TextField label="Название" name="name" required maxLength={120} placeholder="Мамин бешбармак" />
      <NumberField label="Калории на 100 г" name="kcal_100" suffix="ккал" required />
      <div className="grid grid-cols-3 gap-3">
        <NumberField label="Белки" name="protein_100" suffix="г" />
        <NumberField label="Жиры" name="fat_100" suffix="г" />
        <NumberField label="Углев." name="carbs_100" suffix="г" />
      </div>
      <NumberField label="Съели" name="grams" suffix="г" defaultValue="250" required />
      <FormMessage message={state.message} />
      <SubmitButton>Сохранить и добавить</SubmitButton>
    </form>
  );
}

function BarcodeTab({ onFound }: { onFound: (f: Food) => void }) {
  const [scanning, setScanning] = useState(false);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<{ loading: boolean; error?: string }>({ loading: false });

  const lookup = useCallback(
    async (value: string) => {
      setScanning(false);
      setCode(value);
      setStatus({ loading: true });
      try {
        const res = await fetch(`/api/barcode?code=${encodeURIComponent(value)}`);
        const data = await res.json();
        if (!res.ok) return setStatus({ loading: false, error: data.error ?? "Не получилось найти продукт" });
        setStatus({ loading: false });
        onFound(data.food);
      } catch {
        setStatus({ loading: false, error: "Нет связи. Попробуйте ещё раз." });
      }
    },
    [onFound],
  );

  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-card p-4 shadow-sm">
      {scanning ? (
        <>
          <BarcodeScanner onCode={lookup} />
          <button type="button" onClick={() => setScanning(false)} className="text-sm font-medium text-muted">
            Отмена
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setScanning(true)}
          className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-accent font-semibold text-accent-text"
        >
          <ScanBarcode className="size-6" aria-hidden />
          Сканировать камерой
        </button>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) lookup(code.trim());
        }}
        className="flex items-end gap-2"
      >
        <div className="flex-1">
          <NumberField
            label="Или введите цифры"
            name="code"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="4870000000000"
          />
        </div>
        <button type="submit" className="min-h-12 rounded-2xl bg-card-muted px-4 font-semibold" disabled={status.loading}>
          {status.loading ? "…" : "Найти"}
        </button>
      </form>
      {status.error && <p className="text-sm text-danger">{status.error}</p>}
      <p className="text-xs text-muted">Ищем в справочнике семьи и в открытой базе Open Food Facts.</p>
    </div>
  );
}
