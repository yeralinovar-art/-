"use client";

import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { FormMessage } from "@/components/ui";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/env";
import { translateAuthError } from "@/lib/auth-errors";

type Tokens = { access_token: string; refresh_token: string };

/** Читаем токены сброса пароля из фрагмента адреса (#access_token=…&type=recovery). */
function readRecoveryHash(): Tokens | null | "expired" {
  const params = new URLSearchParams(window.location.hash.slice(1));
  if (params.get("error_code") === "otp_expired" || params.get("error")) return "expired";
  if (params.get("type") !== "recovery") return null;
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  return access_token && refresh_token ? { access_token, refresh_token } : null;
}

/**
 * Если открыли ссылку из письма «сменить пароль» — показываем форму нового пароля
 * вместо обычного входа. Работает в любом браузере.
 */
export function NewPassword({ children }: { children: React.ReactNode }) {
  const [tokens, setTokens] = useState<Tokens | null | "expired">(null);
  const [message, setMessage] = useState<{ type: "error" | "info"; text: string } | undefined>();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Фрагмент адреса доступен только в браузере — читаем после монтирования.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTokens(readRecoveryHash());
  }, []);

  if (tokens === "expired") {
    return (
      <div className="flex flex-col gap-4">
        <FormMessage message={{ type: "error", text: "Ссылка устарела или уже использована. Запросите новую — «Забыли пароль?»." }} />
        {children}
      </div>
    );
  }
  if (!tokens) return <>{children}</>;

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <FormMessage message={{ type: "info", text: "Пароль изменён. Войдите с новым паролем." }} />
        {children}
      </div>
    );
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!tokens || tokens === "expired") return;
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    if (password.length < 8) return setMessage({ type: "error", text: "Пароль — минимум 8 символов" });
    if (password !== String(fd.get("password2") ?? "")) return setMessage({ type: "error", text: "Пароли не совпадают" });
    setBusy(true);
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: sessionError } = await supabase.auth.setSession(tokens);
    const { error } = sessionError ? { error: sessionError } : await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setMessage({ type: "error", text: translateAuthError(error.message) });
    await supabase.auth.signOut({ scope: "local" });
    history.replaceState(null, "", window.location.pathname);
    setDone(true);
  }

  const input = "min-h-12 rounded-2xl border border-line bg-card px-4 outline-none transition focus:border-accent";
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Новый пароль</h2>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted">Новый пароль</span>
        <input name="password" type="password" autoComplete="new-password" minLength={8} required className={input} />
        <span className="text-xs text-muted">Минимум 8 символов. iPhone предложит сохранить его.</span>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted">Ещё раз</span>
        <input name="password2" type="password" autoComplete="new-password" minLength={8} required className={input} />
      </label>
      <FormMessage message={message} />
      <button
        type="submit"
        disabled={busy}
        className="min-h-12 w-full rounded-2xl bg-accent px-5 font-semibold text-accent-text transition active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? "Секунду…" : "Сохранить пароль"}
      </button>
    </form>
  );
}
