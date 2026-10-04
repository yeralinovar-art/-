import { redirect } from "next/navigation";
import { SetupNotice } from "@/components/SetupNotice";
import { isSupabaseConfigured } from "@/lib/env";
import { getSession } from "@/lib/session";
import { AuthForm } from "./AuthForm";

export const metadata = { title: "Вход — Семья" };

export default async function LoginPage() {
  if (isSupabaseConfigured && (await getSession())) redirect("/");

  return (
    <main className="pt-safe mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-5 py-10">
      <header className="flex flex-col items-center gap-3 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/192.png" alt="" className="size-20 rounded-[22px] shadow-md" />
        <h1 className="text-3xl font-bold tracking-tight">Семья</h1>
        <p className="text-muted">Меню, питание, вес и дела — для нас двоих</p>
      </header>
      {isSupabaseConfigured ? <AuthForm /> : <SetupNotice />}
    </main>
  );
}
