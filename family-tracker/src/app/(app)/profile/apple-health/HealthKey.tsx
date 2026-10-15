"use client";

import { useActionState, useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { FormMessage, SubmitButton } from "@/components/ui";
import { createHealthKey, type HealthKeyState } from "./actions";

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Нет доступа к буферу — значение можно выделить вручную.
    }
  }
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 break-all rounded-2xl bg-card-muted px-3 py-2.5 text-sm select-all">{value}</code>
        <button
          type="button"
          onClick={copy}
          aria-label={`Скопировать: ${label}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-text active:scale-95"
        >
          {copied ? <Check className="size-5" aria-hidden /> : <Copy className="size-5" aria-hidden />}
        </button>
      </div>
    </div>
  );
}

export function HealthKey({ endpoint, connected }: { endpoint: string; connected: boolean }) {
  const [state, action] = useActionState<HealthKeyState>(createHealthKey, {});

  return (
    <div className="flex flex-col gap-3">
      <CopyField label="Адрес" value={endpoint} />
      {state.key ? (
        <>
          <CopyField label="Ключ" value={state.key} />
          <p className="text-sm text-muted">
            Ключ показывается один раз. Вставьте его в команду сейчас. Потеряли — просто создайте новый.
          </p>
        </>
      ) : (
        <form action={action} className="flex flex-col gap-2">
          {connected && (
            <p className="text-sm text-muted">Ключ уже создан. Новый ключ заменит старый — его нужно будет вставить в команду заново.</p>
          )}
          <SubmitButton className="flex items-center justify-center gap-2">
            <KeyRound className="size-5" aria-hidden />
            {connected ? "Создать новый ключ" : "Создать ключ"}
          </SubmitButton>
        </form>
      )}
      <FormMessage message={state.message} />
    </div>
  );
}
