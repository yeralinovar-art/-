import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getChildren, getVisits } from "@/lib/meds-data";
import { requireFamilySession } from "@/lib/session";
import { deleteVisit } from "../../kids/actions";
import { VisitForm } from "../VisitForm";

export const metadata = { title: "Визит — Семья" };

export default async function EditVisitPage({ params }: PageProps<"/visits/[id]">) {
  const { id } = await params;
  const [, children, visits] = await Promise.all([requireFamilySession(), getChildren(), getVisits()]);
  const visit = visits.find((v) => v.id === id);
  if (!visit) notFound();
  const people = [{ value: "me", label: "Я" }, ...children.map((c) => ({ value: c.id, label: c.name }))];
  const back = visit.child_id ? `/kids/${visit.child_id}` : "/visits";

  return (
    <>
      <header className="flex items-center gap-2 pt-4 pb-4">
        <Link href={back} aria-label="Назад" className="-ml-2 flex size-11 items-center justify-center rounded-full active:bg-card-muted">
          <ChevronLeft className="size-6" aria-hidden />
        </Link>
        <h1 className="truncate text-2xl font-bold">{visit.title}</h1>
      </header>
      <div className="flex flex-col gap-4">
        <VisitForm visit={visit} people={people} defaultFor="me" back={back} />
        <form action={deleteVisit}>
          <input type="hidden" name="id" value={visit.id} />
          <button type="submit" className="min-h-12 w-full rounded-2xl bg-card font-semibold text-danger shadow-sm active:scale-[0.98]">
            Удалить запись
          </button>
        </form>
      </div>
    </>
  );
}
