"use client";

import { useActionState, useState } from "react";
import { FormMessage, SubmitButton, TextField } from "@/components/ui";
import { requestPasswordReset, signIn, signUp, type AuthState } from "./actions";

export function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [signInState, signInAction] = useActionState<AuthState, FormData>(signIn, {});
  const [signUpState, signUpAction] = useActionState<AuthState, FormData>(signUp, {});
  const [resetState, resetAction] = useActionState<AuthState, FormData>(requestPasswordReset, {});
  const isSignUp = mode === "signup";
  const state = isSignUp ? signUpState : signInState;

  if (mode === "reset") {
    return (
      <form action={resetAction} className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Сброс пароля</h2>
        <p className="text-sm text-muted">Пришлём на почту ссылку — по ней можно задать новый пароль. Все ваши данные сохранятся.</p>
        <TextField
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          defaultValue={resetState.fields?.email ?? signInState.fields?.email}
          required
        />
        <FormMessage message={resetState.message} />
        <SubmitButton pendingText="Отправляю…">Прислать ссылку</SubmitButton>
        <button type="button" onClick={() => setMode("signin")} className="min-h-11 text-sm font-medium text-accent">
          ← Назад ко входу
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 rounded-2xl bg-card-muted p-1" role="tablist">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`min-h-11 rounded-xl text-sm font-semibold transition ${
              mode === m ? "bg-card text-text shadow-sm" : "text-muted"
            }`}
          >
            {m === "signin" ? "Вход" : "Регистрация"}
          </button>
        ))}
      </div>

      <form
        key={mode}
        action={isSignUp ? signUpAction : signInAction}
        className="flex flex-col gap-4"
      >
        {isSignUp && (
          <TextField
            label="Как вас зовут"
            name="display_name"
            autoComplete="given-name"
            placeholder="Разия"
            defaultValue={state.fields?.displayName}
            maxLength={40}
            required
          />
        )}
        <TextField
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          placeholder="you@example.com"
          defaultValue={state.fields?.email}
          required
        />
        <TextField
          label="Пароль"
          name="password"
          type="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          minLength={isSignUp ? 8 : undefined}
          hint={isSignUp ? "Минимум 8 символов" : undefined}
          required
        />
        <FormMessage message={state.message} />
        <SubmitButton>{isSignUp ? "Создать аккаунт" : "Войти"}</SubmitButton>
        {!isSignUp && (
          <button type="button" onClick={() => setMode("reset")} className="min-h-11 text-sm font-medium text-accent">
            Забыли пароль?
          </button>
        )}
      </form>
    </div>
  );
}
