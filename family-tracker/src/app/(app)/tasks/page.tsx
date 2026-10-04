import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { TaskList } from "@/components/TaskList";
import { Card } from "@/components/ui";
import { toTaskItems } from "@/lib/task-items";
import { inView, sortTasks, type TaskView } from "@/lib/tasks";
import { getTasks } from "@/lib/tasks-data";
import { requireFamilySession } from "@/lib/session";
import { todayKey } from "@/lib/time";
import { TasksTabs } from "./TasksTabs";

export const metadata = { title: "Дела — Семья" };

const VIEWS: { value: TaskView; label: string }[] = [
  { value: "today", label: "Сегодня" },
  { value: "week", label: "Неделя" },
  { value: "overdue", label: "Просрочено" },
  { value: "all", label: "Все" },
];

const EMPTY: Record<TaskView, string> = {
  today: "На сегодня задач нет.",
  week: "На неделю задач со сроком нет.",
  overdue: "Просроченных нет 👍",
  all: "Задач пока нет. Добавьте первую.",
};

export default async function TasksPage({ searchParams }: PageProps<"/tasks">) {
  const params = await searchParams;
  const view = VIEWS.some((v) => v.value === params.view) ? (params.view as TaskView) : "today";
  const today = todayKey();
  const [session, tasks] = await Promise.all([requireFamilySession(), getTasks(today)]);
  const open = tasks.filter((t) => t.status !== "done");
  const counts = Object.fromEntries(VIEWS.map((v) => [v.value, open.filter((t) => inView(t, v.value, today)).length]));
  const list = sortTasks(open.filter((t) => inView(t, view, today)));
  const noDate = view === "today" ? open.filter((t) => !t.due_date).length : 0;
  const done = tasks
    .filter((t) => t.status === "done")
    .sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? ""))
    .slice(0, 20);
  const back = view === "today" ? "/tasks" : `/tasks?view=${view}`;

  return (
    <>
      <PageHeader title="Дела" subtitle="Личные и общие задачи" profile={session.profile} />
      <TasksTabs />
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {VIEWS.map((v) => (
            <Link
              key={v.value}
              href={v.value === "today" ? "/tasks" : `/tasks?view=${v.value}`}
              aria-current={view === v.value ? "page" : undefined}
              className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition ${
                view === v.value ? "bg-accent text-accent-text" : "bg-card shadow-sm"
              }`}
            >
              {v.label}
              {counts[v.value] > 0 && (
                <span className={`text-xs ${v.value === "overdue" && view !== v.value ? "text-danger" : "opacity-70"}`}>{counts[v.value]}</span>
              )}
            </Link>
          ))}
        </div>

        <Link
          href={`/tasks/new?back=${encodeURIComponent(back)}`}
          className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-5 font-semibold text-accent-text active:scale-[0.98]"
        >
          <Plus className="size-5" aria-hidden />
          Новая задача
        </Link>

        <Card>
          {list.length ? (
            <TaskList items={toTaskItems(list, session, today)} back={back} />
          ) : (
            <p className="py-2 text-sm text-muted">{EMPTY[view]}</p>
          )}
          {noDate > 0 && (
            <Link href="/tasks?view=all" className="mt-1 block text-sm font-medium text-accent">
              Без срока: {noDate} →
            </Link>
          )}
        </Card>

        {done.length > 0 && (
          <details className="rounded-3xl bg-card p-4 shadow-sm">
            <summary className="cursor-pointer font-semibold">Сделано за неделю · {done.length}</summary>
            <div className="mt-2">
              <TaskList items={toTaskItems(done, session, today)} back={back} />
            </div>
          </details>
        )}
      </div>
    </>
  );
}
