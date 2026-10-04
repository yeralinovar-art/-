import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getChildren, getMedications } from "@/lib/meds-data";
import { requireFamilySession } from "@/lib/session";
import { archiveMedication } from "../actions";
import { MedForm } from "../MedForm";

export const metadata = { title: "Витамин — Семья" };

export default async function EditMedPage({ params }: PageProps<"/meds/[id]">) {
  const { id } = await params;
  const [, children, meds] = await Promise.all([requireFamilySession(), getChildren(), getMedications()]);
  const med = meds.find((m) => m.id === id);
  if (!med) notFound();
  const people = [{ value: "me", label: "Я" }, ...children.map((c) => ({ value: c.id, label: c.name }))];

  return (
    <>
      <header className="flex items-center gap-2 pt-4 pb-4">
        <Link href="/meds" aria-label="Назад" className="-ml-2 flex size-11 items-center justify-center rounded-full active:bg-card-muted">
          <ChevronLeft className="size-6" aria-hidden />
        </Link>
        <h1 className="truncate text-2xl font-bold">{med.name}</h1>
      </header>
      <div className="flex flex-col gap-4">
        <MedForm med={med} people={people} defaultFor="me" />
        <form action={archiveMedication}>
          <input type="hidden" name="id" value={med.id} />
          <button type="submit" className="min-h-12 w-full rounded-2xl bg-card font-semibold text-danger shadow-sm active:scale-[0.98]">
            Больше не принимаю
          </button>
        </form>
      </div>
    </>
  );
}
