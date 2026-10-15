import { BackHeader } from "@/components/BackHeader";
import { Card } from "@/components/ui";
import { requireFamilySession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PrefsForm, PushSetup } from "./PushSetup";

export const metadata = { title: "Напоминания — Семья" };

export default async function NotificationsPage() {
  const [{ userId }, supabase] = await Promise.all([requireFamilySession(), createClient()]);
  const [{ data: prefs }, { count }] = await Promise.all([
    supabase.from("notification_prefs").select("meds, tasks, visits, water, workout").eq("user_id", userId).maybeSingle(),
    supabase.from("push_subscriptions").select("endpoint", { count: "exact", head: true }),
  ]);
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

  return (
    <>
      <BackHeader href="/profile" title="Напоминания" />
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3">
          <div>
            <h2 className="font-semibold">Уведомления на телефон</h2>
            <p className="text-sm text-muted">
              Бесплатно, без сторонних сервисов. Включите на каждом телефоне, где нужны напоминания.
              {count ? ` Подключено устройств: ${count}.` : ""}
            </p>
          </div>
          {publicKey ? <PushSetup publicKey={publicKey} /> : <p className="text-sm text-muted">Уведомления ещё не настроены на сервере.</p>}
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="font-semibold">О чём напоминать</h2>
          <PrefsForm prefs={prefs ?? { meds: true, tasks: true, visits: true, water: false, workout: false }} />
        </Card>
      </div>
    </>
  );
}
