// Разбор полей форм. На iPhone в числах часто ставят запятую — принимаем и её.

export type FormMessageState = { message?: { type: "error" | "info"; text: string } };

export function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Число или null, если поле пустое. NaN — если введено не число. */
export function num(formData: FormData, key: string): number | null {
  const raw = str(formData, key).replace(",", ".").replace(/\s/g, "");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : Number.NaN;
}

export function isDate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
}

export function error(text: string): FormMessageState {
  return { message: { type: "error", text } };
}

export function ok(text: string): FormMessageState {
  return { message: { type: "info", text } };
}

/** Проверка диапазона: null — пусто, допустимо; иначе текст ошибки. */
export function checkRange(value: number | null, min: number, max: number, label: string): string | null {
  if (value === null) return null;
  if (Number.isNaN(value)) return `${label}: введите число`;
  if (value < min || value > max) return `${label}: от ${min} до ${max}`;
  return null;
}
