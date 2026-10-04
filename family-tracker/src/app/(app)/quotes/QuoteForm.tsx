"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton, TextField } from "@/components/ui";
import type { FormMessageState } from "@/lib/form";
import { addQuote } from "../activity/actions";

export function QuoteForm() {
  const [state, action] = useActionState<FormMessageState, FormData>(addQuote, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted">Своя цитата</span>
        <textarea
          name="text"
          required
          maxLength={400}
          className="min-h-20 rounded-2xl border border-line bg-card px-4 py-3 outline-none transition focus:border-accent"
        />
      </label>
      <TextField label="Автор" name="author" maxLength={80} placeholder="можно оставить пустым" />
      <FormMessage message={state.message} />
      <SubmitButton variant="secondary" pendingText="Добавляю…">
        Добавить цитату
      </SubmitButton>
    </form>
  );
}
