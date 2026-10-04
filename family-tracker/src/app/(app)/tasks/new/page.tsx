import { BackHeader } from "@/components/BackHeader";
import { requireFamilySession } from "@/lib/session";
import { getProjects } from "@/lib/timetrack-data";
import { TaskForm } from "../TaskForm";

export const metadata = { title: "Новая задача — Семья" };

function safeBack(v: unknown, fallback: string) {
  return typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : fallback;
}

export default async function NewTaskPage({ searchParams }: PageProps<"/tasks/new">) {
  const params = await searchParams;
  const [session, projects] = await Promise.all([requireFamilySession(), getProjects()]);
  const plan = typeof params.plan === "string" && /^[0-9a-f-]{36}$/i.test(params.plan) ? params.plan : null;
  const back = safeBack(params.back, plan ? `/tasks/plans/${plan}` : "/tasks");
  return (
    <>
      <BackHeader href={back} title={plan ? "Шаг плана" : "Новая задача"} />
      <TaskForm
        projects={projects}
        me={session.userId}
        partnerName={session.partner?.display_name ?? null}
        back={back}
        planId={plan}
        defaultShared={params.shared === "1"}
      />
    </>
  );
}
