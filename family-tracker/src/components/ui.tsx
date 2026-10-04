"use client";

import { Users } from "lucide-react";
import { useFormStatus } from "react-dom";
import type { ComponentProps, ReactNode } from "react";

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
