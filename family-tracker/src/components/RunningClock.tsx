"use client";

import { useEffect, useState } from "react";
import { formatClock } from "@/lib/timetrack";

/** Тикающий секундомер от момента старта (время старта — с сервера). */
export function RunningClock({ startedAt, serverNow, className = "" }: { startedAt: string; serverNow: number; className?: string }) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    // Поправка на разницу часов телефона и сервера.
    const skew = Date.now() - serverNow;
    const tick = () => setNow(Date.now() - skew);
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [serverNow]);
  return (
    <span className={`tabular-nums ${className}`} role="timer" aria-live="off">
      {formatClock(now - Date.parse(startedAt))}
    </span>
  );
}
