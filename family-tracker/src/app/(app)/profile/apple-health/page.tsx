import { headers } from "next/headers";
import { BackHeader } from "@/components/BackHeader";
import { Card } from "@/components/ui";
import { requireFamilySession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { TIME_ZONE } from "@/lib/time";
import { disconnectHealth } from "./actions";
import { HealthKey } from "./HealthKey";

export const metadata = { title: "Apple Health — Семья" };

async function endpointUrl() {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (base) return `${base}/api/health-import`;
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}/api/health-import`;
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-card-muted text-xs font-semibold">{n}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}

export default async function AppleHealthPage() {
  const [{ userId }, endpoint] = await Promise.all([requireFamilySession(), endpointUrl()]);
  const supabase = await createClient();
  const { data: link } = await supabase
    .from("health_tokens")
    .select("created_at, last_import_at, last_summary")
    .eq("user_id", userId)
    .maybeSingle();
  const lastAt = link?.last_import_at
    ? new Intl.DateTimeFormat("ru-RU", { timeZone: TIME_ZONE, day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(
        new Date(link.last_import_at),
      )
    : null;

  return (
    <>
      <BackHeader href="/profile" title="Apple Health" />
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-2">
          <h2 className="font-semibold">Шаги и вес с iPhone — сами</h2>
          <p className="text-sm text-muted">
            Команда на iPhone раз в день берёт из «Здоровья» шаги, активные калории и последний вес и отправляет сюда. Бесплатно,
            без сторонних сервисов. Данные видите только вы.
          </p>
          <p className="text-sm" role="status">
            {!link ? (
              <span className="text-muted">Не подключено.</span>
            ) : lastAt ? (
              <>
                Последняя отправка: <b>{lastAt}</b> — {link.last_summary}
              </>
            ) : (
              <span className="text-muted">Ключ создан, данных ещё не было. Запустите команду ▶, чтобы проверить.</span>
            )}
          </p>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="font-semibold">1. Ключ и адрес</h2>
          <HealthKey endpoint={endpoint} connected={Boolean(link)} />
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="font-semibold">2. Команда на iPhone</h2>
          <ol className="flex flex-col gap-3 text-sm">
            <Step n={1}>
              Откройте приложение <b>«Команды»</b> → вкладка «Команды» → <b>+</b>. Назовите команду «Семья: здоровье».
            </Step>
            <Step n={2}>
              Добавьте действие <b>«Найти образцы здоровья»</b> (в поиске наберите «образцы»). Тип — <b>Шаги</b>, дата начала —{" "}
              <b>Сегодня</b>, «Группировать по» — <b>День</b>. При первом запуске разрешите доступ к «Здоровью».
            </Step>
            <Step n={3}>
              Ещё одно такое же действие: тип — <b>Активная энергия</b>, дата начала — <b>Сегодня</b>, группировать — <b>День</b>.
            </Step>
            <Step n={4}>
              И ещё одно: тип — <b>Вес</b>, сортировать — <b>Дата начала</b>, порядок — <b>Сначала новые</b>, ограничение — <b>1</b>.
            </Step>
            <Step n={5}>
              Добавьте <b>«Получить содержимое URL»</b>. Вставьте <b>Адрес</b>. Нажмите «Показать больше»: метод — <b>POST</b>, текст
              запроса — <b>JSON</b>. Добавьте 4 поля типа «Текст»:
              <ul className="mt-1.5 flex flex-col gap-1 pl-1">
                <li>
                  <code>key</code> — вставьте <b>Ключ</b>;
                </li>
                <li>
                  <code>steps</code> — переменная из шага 2 (нажмите на неё и выберите «Значение»);
                </li>
                <li>
                  <code>active_kcal</code> — переменная из шага 3 («Значение»);
                </li>
                <li>
                  <code>weight_kg</code> — переменная из шага 4 («Значение»).
                </li>
              </ul>
            </Step>
            <Step n={6}>
              По желанию добавьте <b>«Показать результат»</b> — увидите «Готово: … шагов». Нажмите ▶ и обновите эту страницу: вверху
              появится «Последняя отправка».
            </Step>
          </ol>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="font-semibold">3. Каждый вечер — автоматически</h2>
          <ol className="flex flex-col gap-3 text-sm">
            <Step n={1}>
              В «Командах» вкладка <b>«Автоматизация»</b> → <b>+</b> → <b>«Время суток»</b>.
            </Step>
            <Step n={2}>
              Время — <b>22:00</b>, повтор — <b>Ежедневно</b>, выберите <b>«Запускать сразу»</b> (без вопроса).
            </Step>
            <Step n={3}>
              «Далее» → выберите команду <b>«Семья: здоровье»</b>.
            </Step>
          </ol>
          <p className="text-sm text-muted">
            Можно запускать и вручную в любое время — повторная отправка за день обновляет данные, а не дублирует. Шаги из «Здоровья»
            заменяют введённые вручную за этот день.
          </p>
        </Card>

        {link && (
          <form action={disconnectHealth}>
            <button
              type="submit"
              className="min-h-12 w-full rounded-2xl bg-card font-semibold text-danger shadow-sm active:scale-[0.98]"
            >
              Отключить (ключ перестанет работать)
            </button>
          </form>
        )}
      </div>
    </>
  );
}
