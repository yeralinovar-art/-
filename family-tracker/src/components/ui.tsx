"use client";

import { Users } from "lucide-react";
import { useFormStatus } from "react-dom";
import { useId, type ComponentProps, type ReactNode } from "react";

export function SubmitButton({
  children,
  pendingText = "Секунду…",
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { pendingText?: string; variant?: "primary" | "secondary" }) {
  const { pending } = useFormStatus();
  const styles =
    variant === "primary"
      ? "bg-accent text-accent-text"
      : "bg-card-muted text-text";
  return (
    <button
      type="submit"
      disabled={pending}
      className={`min-h-12 w-full rounded-2xl px-5 font-semibold transition active:scale-[0.98] disabled:opacity-60 ${styles} ${className}`}
      {...props}
    >
      {pending ? pendingText : children}
    </button>
  );
}

export function TextField({
  label,
  hint,
  ...props
}: ComponentProps<"input"> & { label: string; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-muted">{label}</span>
      <input
        className="min-h-12 rounded-2xl border border-line bg-card px-4 outline-none transition focus:border-accent"
        {...props}
      />
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function FormMessage({ message }: { message?: { type: "error" | "info"; text: string } }) {
  if (!message) return null;
  return (
    <p
      role={message.type === "error" ? "alert" : "status"}
      className={`rounded-2xl px-4 py-3 text-sm ${
        message.type === "error" ? "bg-danger/10 text-danger" : "bg-accent-soft text-accent"
      }`}
    >
      {message.text}
    </p>
  );
}

/** Значок «общее для семьи» — ставится на общих разделах. */
export function FamilyBadge({ label = "Общее" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-family-soft px-2 py-0.5 text-xs font-medium text-family">
      <Users className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl bg-card p-4 shadow-sm ${className}`}>{children}</section>;
}

export function SelectField({
  label,
  options,
  id,
  ...props
}: ComponentProps<"select"> & { label: string; options: { value: string; label: string }[] }) {
  // Подпись связана через id, а не обёрткой: иначе в имя поля попадают все варианты.
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-medium text-muted">
        {label}
      </label>
      <select
        id={selectId}
        className="min-h-12 rounded-2xl border border-line bg-card px-4 outline-none transition focus:border-accent"
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Поле для чисел: на iPhone открывает цифровую клавиатуру с запятой. */
export function NumberField({ label, hint, suffix, ...props }: ComponentProps<"input"> & { label: string; hint?: string; suffix?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-muted">{label}</span>
      <span className="relative flex items-center">
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 pr-14 outline-none transition focus:border-accent"
          {...props}
        />
        {suffix && <span className="pointer-events-none absolute right-4 text-sm text-muted">{suffix}</span>}
      </span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Toggle({
  label,
  description,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span className="flex flex-col">
        <span className="font-medium">{label}</span>
        {description && <span className="text-sm text-muted">{description}</span>}
      </span>
      <input type="checkbox" className="peer sr-only" {...props} />
      <span className="relative h-8 w-13 shrink-0 rounded-full bg-card-muted transition peer-checked:bg-accent after:absolute after:top-1 after:left-1 after:size-6 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
    </label>
  );
}

export function ProgressBar({ value, max, tone = "accent" }: { value: number; max: number; tone?: "accent" | "family" | "danger" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const color = tone === "danger" ? "bg-danger" : tone === "family" ? "bg-family" : "bg-accent";
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-card-muted" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemax={Math.round(max)}>
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}
