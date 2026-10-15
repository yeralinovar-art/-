"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

/** Без сети: предупреждаем, что на экране сохранённая версия и изменения не сохранятся. */
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div role="status" className="pt-safe sticky top-0 z-30 -mx-4 mb-2 flex items-center gap-2 bg-family-soft px-4 py-2 text-sm text-family">
      <WifiOff className="size-4 shrink-0" aria-hidden />
      Нет сети — показана сохранённая версия. Изменения не сохранятся, пока интернет не вернётся.
    </div>
  );
}
