"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/app/login/actions";

/** Выход: заодно стираем сохранённые для офлайна страницы — на чужом телефоне ничего не останется. */
export function SignOutButton() {
  function clearOffline() {
    navigator.serviceWorker?.controller?.postMessage("clear-pages");
    caches?.delete("pages-v1").catch(() => {});
  }
  return (
    <form action={signOut} onSubmit={clearOffline}>
      <button
        type="submit"
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-card font-semibold text-danger shadow-sm active:scale-[0.98]"
      >
        <LogOut className="size-5" aria-hidden />
        Выйти
      </button>
    </form>
  );
}
