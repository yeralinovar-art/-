"use client";

import { useActionState, useState } from "react";
import { Camera, Sparkles, X } from "lucide-react";
import { DoctorNote } from "@/components/DoctorNote";
import { FormMessage, SubmitButton } from "@/components/ui";
import { rescaleFoodItem, type FoodEstimateItem } from "@/lib/ai-schemas";
import type { Meal } from "@/lib/data";
import { addEstimatedFood, estimateFood, type EstimateState } from "../ai-actions";

const fmt = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 1 });

/** Сжимаем фото на телефоне: длинная сторона до 1024 px, JPEG. */
async function compress(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.8);
}

export function AiTab({ meal, date, enabled }: { meal: Meal; date: string; enabled: boolean }) {
  const [state, action] = useActionState<EstimateState, FormData>(estimateFood, {});
  const [photo, setPhoto] = useState<string | null>(null);

  if (!enabled) {
    return (
      <p className="rounded-2xl bg-card p-4 text-sm text-muted shadow-sm">
        AI-оценка заработает, когда в настройках приложения появится ключ Claude API. Пока можно искать в справочнике или ввести калории быстро.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <form action={action} className="flex flex-col gap-3">
        <textarea
          name="text"
          aria-label="Что съели"
          placeholder="Например: плов 250 г, салат из помидоров, чай с молоком и 2 баурсака"
          maxLength={1000}
          className="min-h-24 rounded-2xl border border-line bg-card px-4 py-3 outline-none focus:border-accent"
        />
        <input type="hidden" name="photo" value={photo ?? ""} />
        {photo ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- локальный предпросмотр */}
            <img src={photo} alt="Фото тарелки" className="max-h-56 w-full rounded-2xl object-cover" />
            <button
              type="button"
              onClick={() => setPhoto(null)}
              aria-label="Убрать фото"
              className="absolute top-2 right-2 flex size-9 items-center justify-center rounded-full bg-black/50 text-white"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
        ) : (
          <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line text-sm text-muted">
            <Camera className="size-5" aria-hidden />
            Сфотографировать тарелку
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              aria-label="Фото еды"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setPhoto(await compress(f));
              }}
            />
          </label>
        )}
        <SubmitButton pendingText="AI считает…">
          <span className="inline-flex items-center gap-2">
            <Sparkles className="size-5" aria-hidden />
            Оценить калории
          </span>
        </SubmitButton>
        {state.error && <FormMessage message={{ type: "error", text: state.error }} />}
      </form>

      {state.items && <Result key={JSON.stringify(state.items)} items={state.items} comment={state.comment ?? null} meal={meal} date={date} />}
    </div>
  );
}

function Result({ items: initial, comment, meal, date }: { items: FoodEstimateItem[]; comment: string | null; meal: Meal; date: string }) {
  const [items, setItems] = useState(initial.map((i) => ({ item: i, on: true })));
  const chosen = items.filter((i) => i.on).map((i) => i.item);
  const total = chosen.reduce((s, i) => s + i.kcal, 0);
  const warnings = chosen.filter((i) => i.pregnancy_note);

  return (
    <form action={addEstimatedFood} className="flex flex-col gap-3 rounded-3xl bg-card p-4 shadow-sm">
      <input type="hidden" name="meal" value={meal} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="items" value={JSON.stringify(chosen)} />
      <h3 className="font-semibold">Проверьте и поправьте вес</h3>
      {comment && <p className="text-sm text-muted">{comment}</p>}
      <ul className="flex flex-col divide-y divide-line">
        {items.map(({ item, on }, idx) => (
          <li key={idx} className="flex items-center gap-3 py-2.5">
            <input
              type="checkbox"
              checked={on}
              onChange={() => setItems((list) => list.map((x, j) => (j === idx ? { ...x, on: !x.on } : x)))}
              aria-label={`Добавить: ${item.name}`}
              className="size-5 shrink-0 accent-[var(--accent)]"
            />
            <span className="min-w-0 flex-1">
              <span className={`block truncate font-medium ${on ? "" : "text-muted line-through"}`}>{item.name}</span>
              <span className="block truncate text-xs text-muted">
                {Math.round(item.kcal)} ккал · Б {fmt(item.protein)} · Ж {fmt(item.fat)} · У {fmt(item.carbs)}
                {item.caffeine_mg ? ` · кофеин ${item.caffeine_mg} мг` : ""}
              </span>
            </span>
            <label className="flex shrink-0 items-center gap-1">
              <input
                inputMode="numeric"
                defaultValue={item.grams}
                aria-label={`Вес: ${item.name}`}
                onBlur={(e) => {
                  const g = Number(e.target.value.replace(",", "."));
                  if (g > 0) setItems((list) => list.map((x, j) => (j === idx ? { ...x, item: rescaleFoodItem(x.item, g) } : x)));
                }}
                className="h-10 w-16 rounded-xl border border-line bg-card px-2 text-right outline-none focus:border-accent"
              />
              <span className="text-xs text-muted">{item.unit}</span>
            </label>
          </li>
        ))}
      </ul>
      {warnings.length > 0 && <DoctorNote>{warnings.map((w) => `${w.name}: ${w.pregnancy_note}`).join(". ")}</DoctorNote>}
      <p className="text-xs text-muted">Оценка AI приблизительная — проверьте вес порции.</p>
      <SubmitButton pendingText="Добавляю…" disabled={!chosen.length}>
        Добавить в дневник · {Math.round(total)} ккал
      </SubmitButton>
    </form>
  );
}
