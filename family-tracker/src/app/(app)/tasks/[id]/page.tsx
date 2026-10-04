import { notFound } from "next/navigation";
import { BackHeader } from "@/components/BackHeader";
import { SubmitButton } from "@/components/ui";
import { requireFamilySession } from "@/lib/session";
import { getProjects } from "@/lib/timetrack-data";
import { getTask } from "@/lib/tasks-data";
import { deleteTask } from "../actions";
import { TaskForm } from "../TaskForm";

export const metadata = { title: "Задача — Семья" };

export default async function TaskPage({ params, searchParams }: PageProps<"/tasks/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [session, task, projects] = await Promise.all([requireFamilySession(), getTask(id), getProjects()]);
  if (!task) notFound();
  const fallback = task.plan_id ? `/tasks/plans/${task.plan_id}` : "/tasks";
  const back = typeof sp.back === "string" && sp.back.startsWith("/") && !sp.back.startsWith("//") ? sp.back : fallback;
  return (
    <>
      <BackHeader href={back} title={task.shared ? "Общая задача" : "Задача"} />
      <div className="flex flex-col gap-4">
        <TaskForm projects={projects} task={task} me={session.userId} partnerName={session.partner?.display_name ?? null} back={back} />
        <form action={deleteTask}>
          <input type="hidden" name="id" value={task.id} />
          <input type="hidden" name="back" value={back} />
          <SubmitButton variant="secondary" className="text-danger" pendingText="Удаляю…">
            Удалить задачу
          </SubmitButton>
        </form>
      </div>
    </>
  );
}
