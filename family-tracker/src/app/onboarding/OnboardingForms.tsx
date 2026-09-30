"use client";

import { useActionState } from "react";
import { Card, FormMessage, SubmitButton, TextField } from "@/components/ui";
import { createFamily, joinFamily, type OnboardingState } from "./actions";

export function OnboardingForms() {
  const [createState, createAction] = useActionState<OnboardingState, FormData>(createFamily, {});
  const [joinState, joinAction] = useActionState<OnboardingState, FormData>(joinFamily, {});

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <form action={joinAction} className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold">У партнёра уже есть семья</h2>
            <p className="text-sm text-muted">Введите код из профиля партнёра.</p>
          </div>
          <TextField
            label="Код семьи"
            name="code"
            placeholder="A1B2C3"
            defaultValue={joinState.code}
            autoCapitalize="characters"
            autoComplete="off"
            maxLength={6}
            className="min-h-12 rounded-2xl border border-line bg-card px-4 text-center font-mono text-xl tracking-[0.4em] uppercase outline-none focus:border-accent"
            required
          />
          <FormMessage message={joinState.message} />
          <SubmitButton>Вступить</SubmitButton>
        </form>
      </Card>

      <p className="text-center text-sm text-muted">или</p>

      <Card>
        <form action={createAction} className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold">Создать новую семью</h2>
            <p className="text-sm text-muted">Потом отправьте код партнёру.</p>
          </div>
          <TextField label="Название" name="name" placeholder="Наша семья" maxLength={60} />
          <FormMessage message={createState.message} />
          <SubmitButton variant="secondary">Создать семью</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
