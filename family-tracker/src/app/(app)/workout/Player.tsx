"use client";

import { useEffect, useState } from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { logWorkout } from "@/app/(app)/activity/actions";
import { Card, ProgressBar, SubmitButton } from "@/components/ui";
import type { Step, Version } from "@/lib/workouts";

const KIND_LABEL: Record<Step["kind"], string> = { warmup: "Разминка", work: "Упражнение", rest: "Отдых", cooldown: "Заминка" };

/** Пошаговая тренировка со встроенным таймером: по нулю — следующий шаг. */
export function Player({ steps, workoutKey, version, minutes }: { steps: Step[]; workoutKey: string; version: Version; minutes: number }) {
  const [pos, setPos] = useState({ idx: 0, left: steps[0].seconds });
  const [running, setRunning] = useState(false);
  const { idx, left } = pos;
  const finished = idx >= steps.length;
  const step = steps[Math.min(idx, steps.length - 1)];
  const rounds = Math.max(...steps.map((s) => s.round ?? 0));

  // Тик раз в секунду; по нулю — следующий шаг.
  useEffect(() => {
    if (!running || finished) return;
    const t = setInterval(
      () =>
        setPos((p) =>
          p.left > 1 ? { ...p, left: p.left - 1 } : { idx: p.idx + 1, left: steps[p.idx + 1]?.seconds ?? 0 },
        ),
      1000,
    );
    return () => clearInterval(t);
  }, [running, finished, steps]);

  // Смена шага во время тренировки — короткая вибрация, где она есть.
  useEffect(() => {
    if (!running || idx === 0) return;
    try {
      navigator.vibrate?.(200);
    } catch {
      // нет вибрации — не страшно
    }
  }, [idx, running]);

  const go = (to: number) => {
    if (to >= steps.length) return setPos({ idx: steps.length, left: 0 });
    const i = Math.max(0, to);
    setPos({ idx: i, left: steps[i].seconds });
  };

  const nextUp = steps.slice(idx + 1).find((s) => s.kind !== "rest");

  if (finished) {
    return (
      <Card className="flex flex-col items-center gap-3 py-6 text-center">
        <p className="text-4xl" aria-hidden>
          💪
        </p>
        <h2 className="text-xl font-semibold">Последний шаг позади</h2>
        <form action={logWorkout} className="w-full">
          <input type="hidden" name="workout_key" value={workoutKey} />
          <input type="hidden" name="version" value={version} />
          <input type="hidden" name="status" value="done" />
          <input type="hidden" name="minutes" value={minutes} />
          <input type="hidden" name="from" value="player" />
          <SubmitButton pendingText="Записываю…">Готово — отметить</SubmitButton>
        </form>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ProgressBar value={idx} max={steps.length} />
      <Card className={`flex flex-col items-center gap-2 py-6 text-center ${step.kind === "rest" ? "bg-card-muted" : ""}`}>
        <p className="text-sm text-muted">
          {KIND_LABEL[step.kind]}
          {step.round && step.kind === "work" ? ` · круг ${step.round} из ${rounds}` : ""} · шаг {idx + 1} из {steps.length}
        </p>
        <h2 className="text-2xl font-bold">{step.name}</h2>
        <p className="text-6xl font-bold tabular-nums" role="timer" aria-live="off">
          {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
        </p>
        <p className="max-w-xs text-sm text-muted">{step.how}</p>
      </Card>
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => go(idx - 1)}
          aria-label="Предыдущий шаг"
          className="flex size-14 items-center justify-center rounded-full bg-card shadow-sm active:scale-95"
        >
          <SkipBack className="size-6" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setRunning((r) => !r)}
          aria-label={running ? "Пауза" : "Старт"}
          className="flex size-20 items-center justify-center rounded-full bg-accent text-accent-text shadow-md active:scale-95"
        >
          {running ? <Pause className="size-9" fill="currentColor" aria-hidden /> : <Play className="size-9" fill="currentColor" aria-hidden />}
        </button>
        <button
          type="button"
          onClick={() => go(idx + 1)}
          aria-label="Следующий шаг"
          className="flex size-14 items-center justify-center rounded-full bg-card shadow-sm active:scale-95"
        >
          <SkipForward className="size-6" aria-hidden />
        </button>
      </div>
      {nextUp && <p className="text-center text-sm text-muted">Дальше: {nextUp.name}</p>}
    </div>
  );
}
