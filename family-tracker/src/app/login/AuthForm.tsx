"use client";

import { useActionState, useState } from "react";
import { FormMessage, SubmitButton, TextField } from "@/components/ui";
import { signIn, signUp, type AuthState } from "./actions";

export function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signInState, signInAction] = useActionState<AuthState, FormData>(signIn, {});
  const [signUpState, signUpAction] = useActionState<AuthState, FormData>(signUp, {});
  const isSignUp = mode === "signup";
  const state = isSignUp ? signUpState : signInState;

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
      </form>
    </div>
  );
}
