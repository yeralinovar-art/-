import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getChildren } from "@/lib/meds-data";
import { requireFamilySession } from "@/lib/session";
import { MedForm } from "../MedForm";

export const metadata = { title: "Добавить витамин — Семья" };

export default async function NewMedPage({ searchParams }: PageProps<"/meds/new">) {
  const [, children, params] = await Promise.all([requireFamilySession(), getChildren(), searchParams]);
  const people = [{ value: "me", label: "Я" }, ...children.map((c) => ({ value: c.id, label: c.name }))];
  const requested = typeof params.for === "string" ? params.for : "me";

  return (
    <>
      <header className="flex items-center gap-2 pt-4 pb-4">
        <Link href="/meds" aria-label="Назад" className="-ml-2 flex size-11 items-center justify-center rounded-full active:bg-card-muted">
          <ChevronLeft className="size-6" aria-hidden />
        </Link>
        <h1 className="text-2xl font-bold">Новый витамин</h1>
      </header>
      <MedForm people={people} defaultFor={people.some((p) => p.value === requested) ? requested : "me"} />
    </>
  );
}
