"use client";

import { useActionState, useState } from "react";
import { CalendarPlus, Check, Copy, Link2 } from "lucide-react";
import { FormMessage, SubmitButton } from "@/components/ui";
import { createFeedKey, saveImportUrl, type FeedKeyState, type ImportState } from "./actions";

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Нет доступа к буферу — ссылку можно выделить вручную.
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-text active:scale-95"
    >
      {copied ? <Check className="size-5" aria-hidden /> : <Copy className="size-5" aria-hidden />}
    </button>
  );
}

const linkButton = "flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-center font-semibold active:scale-[0.98]";

export function FeedKey({ origin, hasFeed }: { origin: string; hasFeed: boolean }) {
  const [state, action] = useActionState<FeedKeyState>(createFeedKey, {});
  if (state.key) {
    const https = `${origin}/api/calendar/${state.key}.ics`;
    const webcal = https.replace(/^https?:\/\//, "webcal://");
    return (
      <div className="flex flex-col gap-3">
        <a href={webcal} className={`${linkButton} bg-accent text-accent-text`}>
          <CalendarPlus className="size-5" aria-hidden />
          Добавить в календарь iPhone
        </a>
        <a
          href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`}
          target="_blank"
          rel="noreferrer"
          className={`${linkButton} bg-card-muted`}
        >
          Добавить в Google Календарь
        </a>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 break-all rounded-2xl bg-card-muted px-3 py-2.5 text-xs select-all" data-testid="feed-url">
            {https}
          </code>
          <CopyButton value={https} label="Скопировать ссылку-подписку" />
        </div>
        <p className="text-sm text-muted">
          Ссылка показывается один раз и работает как пароль — не пересылайте её. Потеряли — создайте новую, старая отключится.
        </p>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-2">
      {hasFeed && <p className="text-sm text-muted">Ссылка уже создана. Новая заменит старую — подписку нужно будет добавить заново.</p>}
      <SubmitButton className="flex items-center justify-center gap-2">
        <Link2 className="size-5" aria-hidden />
        {hasFeed ? "Создать новую ссылку" : "Создать ссылку-подписку"}
      </SubmitButton>
      <FormMessage message={state.message} />
    </form>
  );
}

export function ImportForm({ connected }: { connected: boolean }) {
  const [state, action] = useActionState<ImportState, FormData>(saveImportUrl, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{connected ? "Заменить адрес" : "Секретный адрес в формате iCal"}</span>
        <input
          name="import_url"
          type="url"
          required
          inputMode="url"
          autoComplete="off"
          placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
          className="min-h-12 rounded-2xl border border-line bg-card px-4 text-base outline-none focus:border-accent"
        />
      </label>
      <SubmitButton variant={connected ? "secondary" : "primary"}>{connected ? "Сохранить новый адрес" : "Подключить"}</SubmitButton>
      <FormMessage message={state.message} />
    </form>
  );
}
