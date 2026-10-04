import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { TaskList } from "@/components/TaskList";
import { Card, FamilyBadge, ProgressBar } from "@/components/ui";
import { requireFamilySession } from "@/lib/session";
import { toTaskItems } from "@/lib/task-items";
import { dueLabel, planProgress, sortTasks } from "@/lib/tasks";
import { getChores, getPlans, getTasks } from "@/lib/tasks-data";
import { todayKey } from "@/lib/time";
import { TasksTabs } from "../TasksTabs";
import { ChoreForm, ChoreList } from "./Chores";

export const metadata = { title: "Семья — Дела" };

export default async function FamilyPage() {
  const today = todayKey();
  const [session, plans, chores, tasks] = await Promise.all([requireFamilySession(), getPlans(), getChores(), getTasks(today)]);
  const shared = sortTasks(tasks.filter((t) => t.shared && !t.plan_id && t.status !== "done"));
  const names = new Map<string, string>([[session.userId, "я"]]);
  if (session.partner) names.set(session.partner.id, session.partner.display_name);

  return (
    <>
      <PageHeader title="Дела" subtitle="Общее — видят и меняют оба" profile={session.profile} badge={<FamilyBadge label="Семья" />} />
      <TasksTabs />
      <div className="flex flex-col gap-4">
        <Card>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-semibold">Общие задачи</h2>
            <Link
              href={`/tasks/new?shared=1&back=${encodeURIComponent("/tasks/family")}`}
              aria-label="Добавить общую задачу"
              className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent active:scale-95"
            >
              <Plus className="size-5" aria-hidden />
            </Link>
          </div>
          {shared.length ? (
            <TaskList items={toTaskItems(shared, session, today)} back="/tasks/family" />
          ) : (
            <p className="py-1 text-sm text-muted">Нет открытых общих задач.</p>
          )}
        </Card>

        <Card>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-semibold">Планы</h2>
            <Link
              href="/tasks/plans/new"
              aria-label="Новый план"
              className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent active:scale-95"
            >
              <Plus className="size-5" aria-hidden />
            </Link>
          </div>
          {plans.length ? (
            <ul className="flex flex-col divide-y divide-line">
              {plans.map((p) => {
                const pr = planProgress(p.tasks);
                const due = p.done ? null : dueLabel(p.target_date, today);
                return (
                  <li key={p.id}>
                    <Link href={`/tasks/plans/${p.id}`} className="flex items-center gap-3 py-3">
                      <span className="text-2xl" aria-hidden>
                        {p.emoji}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <span className={`truncate font-medium ${p.done ? "text-muted line-through" : ""}`}>{p.title}</span>
                        {pr.total > 0 && <ProgressBar value={pr.pct} max={100} tone="family" />}
                        <span className="truncate text-xs text-muted">
                          {pr.total ? `${pr.done} из ${pr.total} шагов` : "шагов пока нет"}
                          {due ? ` · ${due.text}` : ""}
                        </span>
                      </span>
                      <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-1 text-sm text-muted">Крупные цели с шагами: поездка, покупка, ремонт, подготовка к роддому.</p>
          )}
        </Card>

        <Card>
          <h2 className="mb-1 font-semibold">Домашние дела по очереди</h2>
          <ChoreList
            today={today}
            items={chores.map((c) => ({
              id: c.id,
              title: c.title,
              emoji: c.emoji,
              every: c.every_days,
              rotate: c.rotate,
              next_due: c.next_due,
              who: c.assignee_id ? (names.get(c.assignee_id) ?? "—") : "оба",
              mine: c.assignee_id === session.userId || c.assignee_id === null,
              lastBy: c.last_done_by ? (names.get(c.last_done_by) ?? null) : null,
              lastOn: c.last_done_on,
            }))}
          />
          <details className="mt-3 rounded-2xl bg-card-muted p-3">
            <summary className="cursor-pointer font-medium text-accent">+ Добавить дело</summary>
            <div className="mt-3">
              <ChoreForm partnerName={session.partner?.display_name ?? null} today={today} />
            </div>
          </details>
        </Card>
      </div>
    </>
  );
}
