import { redirect } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { getSession } from "@/lib/session";
import { OnboardingForms } from "./OnboardingForms";

export const metadata = { title: "Семья — начало" };

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.family) redirect("/");

  return (
    <main className="pt-safe mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Привет, {session.profile.display_name}!</h1>
        <p className="text-muted">
          Меню, покупки и общие дела живут в «семье». Личные данные — вес, калории, задачи — видите
          только вы.
        </p>
      </header>
      <OnboardingForms />
      <form action={signOut} className="text-center">
        <button type="submit" className="text-sm text-muted underline">
          Выйти из {session.email}
        </button>
      </form>
    </main>
  );
}
