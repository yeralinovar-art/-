import type { TaskItem } from "@/components/TaskList";
import type { Session } from "@/lib/session";
import { assigneeLabel, dueLabel, type Task } from "@/lib/tasks";

/** Задачи → строки списка с подписями «кому» и «кто сделал». */
export function toTaskItems(tasks: Task[], session: Pick<Session, "userId" | "partner">, today: string): TaskItem[] {
  const partner = session.partner?.display_name ?? null;
  const name = (id: string | null) => (!id ? null : id === session.userId ? "я" : (partner ?? "партнёр"));
  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    done: t.status === "done",
    shared: t.shared,
    priority: t.priority,
    due: dueLabel(t.due_date, today),
    who: assigneeLabel(t, session.userId, partner),
    doneBy: t.shared ? name(t.done_by) : null,
  }));
}
