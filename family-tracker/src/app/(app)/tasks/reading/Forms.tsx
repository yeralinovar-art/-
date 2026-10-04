"use client";

import { useActionState, useState } from "react";
import { FormMessage, NumberField, SelectField, SubmitButton, TextField } from "@/components/ui";
import type { FormMessageState } from "@/lib/form";
import { BOOK_STATUSES } from "@/lib/timetrack";
import type { Book } from "@/lib/timetrack-data";
import { addReadingManual, saveBook, setReadingGoal, updateBook } from "../time-actions";

export function BookForm() {
  const [state, action] = useActionState<FormMessageState, FormData>(saveBook, {});
  const [status, setStatus] = useState<string>("reading");
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="status" value={status} />
      <TextField label="Название" name="title" required maxLength={150} />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Автор" name="author" maxLength={100} />
        <NumberField label="Страниц" name="total_pages" inputMode="numeric" />
      </div>
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-card-muted p-1">
        {BOOK_STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setStatus(s.value)}
            aria-pressed={status === s.value}
            className={`min-h-10 truncate rounded-xl px-1 text-sm font-medium ${status === s.value ? "bg-card shadow-sm" : "text-muted"}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <FormMessage message={state.message} />
      <SubmitButton variant="secondary" pendingText="Добавляю…">
        Добавить книгу
      </SubmitButton>
    </form>
  );
}

export function BookUpdateForm({ book }: { book: Book }) {
  const [state, action] = useActionState<FormMessageState, FormData>(updateBook, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={book.id} />
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="Страница" name="current_page" inputMode="numeric" defaultValue={String(book.current_page)} />
        <SelectField label="Статус" name="status" defaultValue={book.status} options={BOOK_STATUSES.map((s) => ({ value: s.value, label: s.label }))} />
      </div>
      <FormMessage message={state.message} />
      <SubmitButton variant="secondary" pendingText="…">
        Сохранить
      </SubmitButton>
    </form>
  );
}

export function ManualReadingForm({ books, today }: { books: Book[]; today: string }) {
  const [state, action] = useActionState<FormMessageState, FormData>(addReadingManual, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Минут" name="minutes" inputMode="numeric" required />
        <TextField label="Дата" name="date" type="date" defaultValue={today} max={today} />
      </div>
      {books.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Книга"
            name="book_id"
            options={[...books.map((b) => ({ value: b.id, label: b.title })), { value: "", label: "Без книги" }]}
          />
          <NumberField label="Дочитала до стр." name="page" inputMode="numeric" />
        </div>
      )}
      <FormMessage message={state.message} />
      <SubmitButton pendingText="Записываю…">Записать</SubmitButton>
    </form>
  );
}

export function GoalForm({ goal }: { goal: number }) {
  const [state, action] = useActionState<FormMessageState, FormData>(setReadingGoal, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <NumberField label="Минут в день" name="goal" inputMode="numeric" defaultValue={String(goal)} hint="Обычно 15–20 минут" />
      <FormMessage message={state.message} />
      <SubmitButton variant="secondary" pendingText="…">
        Сохранить цель
      </SubmitButton>
    </form>
  );
}
