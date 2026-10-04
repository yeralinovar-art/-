import { BackHeader } from "@/components/BackHeader";
import { requireFamilySession } from "@/lib/session";
import { PlanForm } from "../PlanForm";

export const metadata = { title: "Новый план — Семья" };

export default async function NewPlanPage() {
  await requireFamilySession();
  return (
    <>
      <BackHeader href="/tasks/family" title="Новый план" />
      <PlanForm />
    </>
  );
}
