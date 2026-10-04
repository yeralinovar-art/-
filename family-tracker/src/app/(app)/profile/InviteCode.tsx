"use client";

import { useState } from "react";
import { Check, Share } from "lucide-react";

export function InviteCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const text = `Присоединяйся к нашей семье в приложении «Семья». Код: ${code}\n${window.location.origin}`;
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Пользователь закрыл окно «Поделиться» — ничего не делаем.
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span className="flex-1 rounded-2xl bg-card-muted py-3 text-center font-mono text-2xl font-semibold tracking-[0.35em]">
        {code}
      </span>
      <button
        type="button"
        onClick={share}
        aria-label="Поделиться кодом"
        className="flex size-13 items-center justify-center rounded-2xl bg-family text-white active:scale-95"
      >
        {copied ? <Check className="size-6" aria-hidden /> : <Share className="size-6" aria-hidden />}
      </button>
    </div>
  );
}
