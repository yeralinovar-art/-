import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { BackHeader } from "@/components/BackHeader";
import { TaskList } from "@/components/TaskList";
import { Card, FamilyBadge, ProgressBar, SubmitButton } from "@/components/ui";
import { requireFamilySession } from "@/lib/session";
import { toTaskItems } from "@/lib/task-items";
import { dueLabel, planProgress, sortTasks } from "@/lib/tasks";
import { getPlan } from "@/lib/tasks-data";
import { todayKey } from "@/lib/time";
import { deletePlan, togglePlanDone } from "../../actions";
import { PlanForm } from "../PlanForm";

export const metadata = { title: "План — Семья" };

export default async function PlanPage({ params }: PageProps<"/tasks/plans/[id]">) {
  const { id } = await params;
  const today = todayKey();
  const [session, plan] = await Promise.all([requireFamilySession(), getPlan(id)]);
  if (!plan) notFound();
  const pr = planProgress(plan.tasks);
  const open = sortTasks(plan.tasks.filter((t) => t.status !== "done"));
  const done = plan.tasks.filter((t) => t.status === "done");
  const due = plan.done ? null : dueLabel(plan.target_date, today);
  const back = `/tasks/plans/${plan.id}`;

  return (
    <>
      <BackHeader href="/tasks/family" title={`${plan.emoji} ${plan.title}`} />
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <FamilyBadge label="Видят оба" />
            <span className="text-sm text-muted">
              {pr.done} из {pr.total} · {pr.pct}%
            </span>
          </div>
          <ProgressBar value={pr.pct} max={100} tone="family" />
          {due && <p className={`text-sm ${due.tone === "danger" ? "text-danger" : "text-muted"}`}>Срок: {due.text}</p>}
          {plan.done && <p className="text-sm font-medium text-accent">План выполнен 🎉</p>}
          {plan.note && <p className="text-sm whitespace-pre-line">{plan.note}</p>}
        </Card>

        <Card>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-semibold">Шаги</h2>
            <Link
              href={`/tasks/new?plan=${plan.id}`}
              aria-label="Добавить шаг"
              className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent active:scale-95"
            >
              <Plus className="size-5" aria-hidden />
            </Link>
          </div>
          {open.length + done.length ? (
            <TaskList items={toTaskItems([...open, ...done], session, today)} back={back} />
          ) : (
            <p className="py-1 text-sm text-muted">Разбейте план на шаги — прогресс посчитается сам.</p>
          )}
        </Card>

        <form action={togglePlanDone}>
          <input type="hidden" name="id" value={plan.id} />
          <input type="hidden" name="done" value={plan.done ? "0" : "1"} />
          <SubmitButton variant="secondary" pendingText="…">
            {plan.done ? "Вернуть в работу" : "План выполнен"}
          </SubmitButton>
        </form>

        <details className="rounded-3xl bg-card p-4 shadow-sm">
          <summary className="cursor-pointer font-semibold">Изменить план</summary>
          <div className="mt-3 flex flex-col gap-3">
            <PlanForm plan={plan} />
            <form action={deletePlan}>
              <input type="hidden" name="id" value={plan.id} />
              <SubmitButton variant="secondary" className="text-danger" pendingText="Удаляю…">
                Удалить план со всеми шагами
              </SubmitButton>
            </form>
          </div>
        </details>
      </div>
    </>
  );
}
