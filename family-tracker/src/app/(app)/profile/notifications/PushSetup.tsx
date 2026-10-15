"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { BellOff, BellRing } from "lucide-react";
import { FormMessage, SubmitButton, Toggle } from "@/components/ui";
import { removePushSubscription, savePrefs, savePushSubscription, sendTestPush, type BrowserSubscription, type PrefsState } from "./actions";

type Status = "loading" | "unsupported" | "install" | "denied" | "off" | "on";

function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function detect(): Status | null {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!supported) return ios && !standalone ? "install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  return null;
}

export function PushSetup({ publicKey }: { publicKey: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<{ type: "error" | "info"; text: string }>();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const early = detect();
    if (early) {
      setStatus(early); // eslint-disable-line react-hooks/set-state-in-effect -- состояние браузера известно только на клиенте
      return;
    }
    let cancelled = false;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then(async (sub) => {
        if (cancelled) return;
        if (sub) await savePushSubscription(sub.toJSON() as BrowserSubscription); // держим базу в курсе
        setStatus(sub ? "on" : "off");
      })
      .catch(() => !cancelled && setStatus("off"));
    return () => {
      cancelled = true;
    };
  }, []);

  function enable() {
    setMessage(undefined);
    startTransition(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setStatus(permission === "denied" ? "denied" : "off");
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
        const res = await savePushSubscription(sub.toJSON() as BrowserSubscription);
        if (!res.ok) throw new Error("save");
        setStatus("on");
        setMessage({ type: "info", text: "Готово! Нажмите «Проверить», чтобы получить пробное уведомление." });
      } catch {
        setMessage({ type: "error", text: "Не получилось включить. Попробуйте ещё раз." });
      }
    });
  }

  function disable() {
    setMessage(undefined);
    startTransition(async () => {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("off");
    });
  }

  function test() {
    setMessage(undefined);
    startTransition(async () => setMessage(await sendTestPush()));
  }

  if (status === "loading") return <p className="text-sm text-muted">Проверяем…</p>;
  if (status === "install")
    return (
      <p className="text-sm">
        На iPhone уведомления работают, только когда «Семья» открыта <b>с экрана «Домой»</b> (iOS 16.4 и новее). Установите приложение
        (Профиль → «Установить на iPhone») и откройте эту страницу оттуда.
      </p>
    );
  if (status === "unsupported") return <p className="text-sm text-muted">Этот браузер не поддерживает уведомления.</p>;
  if (status === "denied")
    return (
      <p className="text-sm">
        Уведомления запрещены. Разрешите их: «Настройки» iPhone → «Уведомления» → «Семья» → «Допуск уведомлений». Затем обновите эту страницу.
      </p>
    );

  return (
    <div className="flex flex-col gap-2">
      {status === "on" ? (
        <>
          <p className="flex items-center gap-2 text-sm font-medium text-accent" role="status">
            <BellRing className="size-5" aria-hidden /> Включены на этом устройстве
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={test} disabled={pending} className="min-h-12 rounded-2xl bg-accent font-semibold text-accent-text active:scale-[0.98] disabled:opacity-60">
              Проверить
            </button>
            <button type="button" onClick={disable} disabled={pending} className="min-h-12 rounded-2xl bg-card-muted font-semibold active:scale-[0.98] disabled:opacity-60">
              Выключить
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={enable}
          disabled={pending}
          className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-accent font-semibold text-accent-text active:scale-[0.98] disabled:opacity-60"
        >
          <BellOff className="size-5" aria-hidden />
          {pending ? "Секунду…" : "Включить уведомления"}
        </button>
      )}
      <FormMessage message={message} />
    </div>
  );
}

export type Prefs = { meds: boolean; tasks: boolean; visits: boolean; water: boolean; workout: boolean };

export function PrefsForm({ prefs }: { prefs: Prefs }) {
  const [state, action] = useActionState<PrefsState, FormData>(savePrefs, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <Toggle name="meds" label="Витамины и лекарства" description="В их время, если ещё не отмечены" defaultChecked={prefs.meds} />
      <Toggle name="tasks" label="Дела на сегодня" description="В 9:00 — сегодняшние и просроченные" defaultChecked={prefs.tasks} />
      <Toggle name="visits" label="Врачи и прививки" description="Накануне в 19:00 и утром в день визита" defaultChecked={prefs.visits} />
      <Toggle name="water" label="Вода" description="В 15:00, если выпито меньше половины" defaultChecked={prefs.water} />
      <Toggle name="workout" label="Мини-тренировка" description="В 18:00, если ещё не сделана" defaultChecked={prefs.workout} />
      <SubmitButton variant="secondary">Сохранить</SubmitButton>
      <FormMessage message={state.message} />
    </form>
  );
}
