"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Camera, Plus, Search, Trash2, X } from "lucide-react";
import { FormMessage, NumberField, SubmitButton, TextField, Toggle } from "@/components/ui";
import type { Food } from "@/lib/data";
import type { FormMessageState } from "@/lib/form";
import { INGREDIENT_UNITS, ingredientName, type IngredientUnit } from "@/lib/menu";
import { createClient } from "@/lib/supabase/client";
import { saveRecipe } from "../actions";

export type EditableIngredient = {
  key: string;
  food_id: string | null;
  name: string;
  amount: string;
  unit: IngredientUnit;
  /** Ккал на 1 г/мл и на 1 шт — для подсчёта на лету (окончательно считает сервер). */
  kcalPerGram: number | null;
  gramsPerPiece: number | null;
};

export type RecipeFormValues = {
  id: string | null;
  title: string;
  servings: number;
  cook_minutes: number | null;
  kid_friendly: boolean;
  steps: string;
  note: string;
  photo_path: string | null;
  photo_url: string | null;
  ingredients: EditableIngredient[];
};

const textareaCls = "min-h-40 rounded-2xl border border-line bg-card px-4 py-3 outline-none transition focus:border-accent";
let counter = 0;
const newKey = () => `n${++counter}`;

function rowKcal(i: EditableIngredient): number {
  const amount = Number(i.amount.replace(",", "."));
  if (!i.kcalPerGram || !Number.isFinite(amount) || amount <= 0) return 0;
  const grams = i.unit === "шт" ? amount * (i.gramsPerPiece ?? 0) : amount;
  return i.kcalPerGram * grams;
}

/** Сжимаем фото на телефоне: длинная сторона до 1280 px, JPEG. */
async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas"))), "image/jpeg", 0.82),
  );
}

export function RecipeForm({ values, familyId }: { values: RecipeFormValues; familyId: string }) {
  const [state, action] = useActionState<FormMessageState, FormData>(saveRecipe, {});
  const [rows, setRows] = useState<EditableIngredient[]>(values.ingredients);
  const [servings, setServings] = useState(String(values.servings));
  const [photoPath, setPhotoPath] = useState(values.photo_path);
  const [photoPreview, setPhotoPreview] = useState(values.photo_url);
  const [photoState, setPhotoState] = useState<string | null>(null);

  const total = rows.reduce((s, r) => s + rowKcal(r), 0);
  const per = Number(servings) > 0 ? Math.round(total / Number(servings)) : 0;

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoState("Загружаю фото…");
    try {
      const blob = await compress(file);
      const path = `${familyId}/${crypto.randomUUID()}.jpg`;
      const { error } = await createClient().storage.from("recipe-photos").upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      setPhotoPath(path);
      setPhotoPreview(URL.createObjectURL(blob));
      setPhotoState(null);
    } catch {
      setPhotoState("Не получилось загрузить фото. Попробуйте другое или позже.");
    }
  }

  const update = (key: string, patch: Partial<EditableIngredient>) =>
    setRows((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <form action={action} className="flex flex-col gap-4">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <input type="hidden" name="photo_path" value={photoPath ?? ""} />
      <input
        type="hidden"
        name="ingredients"
        value={JSON.stringify(rows.map((r) => ({ food_id: r.food_id, name: r.name, amount: r.amount, unit: r.unit })))}
      />

      <TextField label="Название" name="title" defaultValue={values.title} required maxLength={100} placeholder="Например: бабушкин плов" />

      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Порций" name="servings" value={servings} onChange={(e) => setServings(e.target.value)} inputMode="numeric" required />
        <NumberField label="Время" name="cook_minutes" defaultValue={values.cook_minutes ?? ""} inputMode="numeric" suffix="мин" />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Ингредиенты</h2>
          {total > 0 && <span className="text-sm text-muted">≈ {per} ккал на порцию</span>}
        </div>
        {rows.length > 0 && (
          <ul className="flex flex-col gap-2">
            {rows.map((r) => (
              <li key={r.key} className="flex items-center gap-2 rounded-2xl bg-card p-2 pl-3 shadow-sm">
                <span className="min-w-0 flex-1 truncate text-sm font-medium" title={r.name}>
                  {r.name}
                  {!r.food_id && <span className="block text-xs font-normal text-muted">без ккал</span>}
                </span>
                <input
                  aria-label={`Количество: ${r.name}`}
                  inputMode="decimal"
                  value={r.amount}
                  onChange={(e) => update(r.key, { amount: e.target.value })}
                  placeholder="—"
                  className="h-10 w-20 rounded-xl border border-line bg-card px-2 text-right outline-none focus:border-accent"
                />
                <select
                  aria-label={`Единица: ${r.name}`}
                  value={r.unit}
                  onChange={(e) => update(r.key, { unit: e.target.value as IngredientUnit })}
                  className="h-10 rounded-xl border border-line bg-card px-1 outline-none focus:border-accent"
                >
                  {INGREDIENT_UNITS.filter((u) => u !== "шт" || r.gramsPerPiece || !r.food_id).map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label={`Убрать: ${r.name}`}
                  onClick={() => setRows((list) => list.filter((x) => x.key !== r.key))}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted active:bg-card-muted"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        <IngredientSearch onAdd={(row) => setRows((list) => [...list, row])} />
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted">Как готовить</span>
        <textarea name="steps" defaultValue={values.steps} maxLength={6000} placeholder={"1. …\n2. …"} className={textareaCls} />
      </label>

      <Toggle label="Подходит детям" description="Без острого, можно дочке" name="kid_friendly" defaultChecked={values.kid_friendly} />

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-muted">Фото</span>
        {photoPreview ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- локальный предпросмотр */}
            <img src={photoPreview} alt="" className="aspect-[4/3] w-full rounded-2xl object-cover" />
            <button
              type="button"
              aria-label="Убрать фото"
              onClick={() => {
                setPhotoPath(null);
                setPhotoPreview(null);
              }}
              className="absolute top-2 right-2 flex size-9 items-center justify-center rounded-full bg-black/50 text-white"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
        ) : (
          <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-line text-muted">
            <Camera className="size-6" aria-hidden />
            <span className="text-sm">Сфотографировать или выбрать</span>
            <input type="file" accept="image/*" onChange={onPhoto} className="sr-only" />
          </label>
        )}
        {photoState && <p className="text-sm text-muted">{photoState}</p>}
      </div>

      <TextField label="Заметка" name="note" defaultValue={values.note} maxLength={300} placeholder="Например: мужу побольше мяса" />

      <FormMessage message={state.message} />
      <SubmitButton pendingText="Сохраняю…" disabled={photoState === "Загружаю фото…"}>
        Сохранить рецепт
      </SubmitButton>
    </form>
  );
}

function IngredientSearch({ onAdd }: { onAdd: (row: EditableIngredient) => void }) {
  const [q, setQ] = useState("");
  const [foods, setFoods] = useState<Food[]>([]);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const query = q.trim();
    if (!query) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/foods?q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
        if (res.ok) setFoods(((await res.json()).foods as Food[]).slice(0, 8));
      } catch {
        // запрос отменён новым вводом
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  function add(row: Omit<EditableIngredient, "key">) {
    onAdd({ ...row, key: newKey() });
    setQ("");
    setFoods([]);
    input.current?.focus();
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="relative flex items-center">
        <Search className="pointer-events-none absolute left-4 size-5 text-muted" aria-hidden />
        <input
          ref={input}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Добавить ингредиент: рис, лук…"
          aria-label="Добавить ингредиент"
          className="min-h-12 w-full rounded-2xl border border-line bg-card pr-4 pl-12 outline-none focus:border-accent"
        />
      </label>
      {q.trim() && (
        <ul className="flex flex-col divide-y divide-line rounded-2xl bg-card px-3 shadow-sm">
          {foods.map((f) => {
            // Штуками по умолчанию — только яйца; остальное в граммах (вес одной штуки подставляем).
            const piece = f.portion_label === "1 шт" || f.portion_label === "1 зубчик";
            const byPiece = piece && /яйц/i.test(f.name);
            return (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() =>
                    add({
                      food_id: f.id,
                      name: ingredientName(f.name),
                      amount: byPiece ? "1" : piece ? String(Math.round(f.portion_g)) : "100",
                      unit: byPiece ? "шт" : f.unit,
                      kcalPerGram: f.kcal_100 / 100,
                      gramsPerPiece: piece ? f.portion_g : null,
                    })
                  }
                  className="flex w-full items-center justify-between gap-3 py-2.5 text-left"
                >
                  <span className="min-w-0 truncate text-sm">{f.name}</span>
                  <span className="shrink-0 text-xs text-muted">{Math.round(f.kcal_100)} ккал/100</span>
                </button>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => add({ food_id: null, name: q.trim().slice(0, 120), amount: "", unit: "г", kcalPerGram: null, gramsPerPiece: null })}
              className="flex w-full items-center gap-2 py-2.5 text-left text-sm font-medium text-accent"
            >
              <Plus className="size-4" aria-hidden />
              Добавить «{q.trim()}» без калорий
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
