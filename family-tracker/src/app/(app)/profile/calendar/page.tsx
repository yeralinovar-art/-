import { headers } from "next/headers";
import { BackHeader } from "@/components/BackHeader";
import { CalendarEvents } from "@/components/CalendarCard";
import { Card } from "@/components/ui";
import { getCalendarLink, getImportedEvents } from "@/lib/calendar-data";
import { requireFamilySession } from "@/lib/session";
import { TIME_ZONE, todayKey } from "@/lib/time";
import { disconnectCalendar, removeImportUrl } from "./actions";
import { FeedKey, ImportForm } from "./CalendarForms";

export const metadata = { title: "Календарь — Семья" };

async function siteOrigin() {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (base) return base;
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="flex flex-col gap-2.5 text-sm">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-card-muted text-xs font-semibold">{i + 1}</span>
          <div className="min-w-0 flex-1">{item}</div>
        </li>
      ))}
    </ol>
  );
}

export default async function CalendarSettingsPage() {
  const today = todayKey();
  const [, origin, link] = await Promise.all([requireFamilySession(), siteOrigin(), getCalendarLink()]);
  const imported = link.importUrl ? await getImportedEvents(today, 1) : null;
  const lastFeed = link.lastFeedAt
    ? new Intl.DateTimeFormat("ru-RU", { timeZone: TIME_ZONE, day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(
        new Date(link.lastFeedAt),
      )
    : null;

  return (
    <>
      <BackHeader href="/profile" title="Календарь" />
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3">
          <div>
            <h2 className="font-semibold">Дела → в ваш календарь</h2>
            <p className="text-sm text-muted">
              Дела со сроком, визиты к врачу, прививки и планы появятся в календаре iPhone или Google и будут обновляться сами. Партнёр
              видит в своей подписке только общие дела и свои.
            </p>
          </div>
          {link.hasFeed && (
            <p className="text-sm" role="status">
              {lastFeed ? (
                <>
                  Календарь последний раз забирал данные: <b>{lastFeed}</b>
                </>
              ) : (
                <span className="text-muted">Ссылка создана, календарь её ещё не открывал.</span>
              )}
            </p>
          )}
          <FeedKey origin={origin} hasFeed={link.hasFeed} />
          <details className="text-sm">
            <summary className="cursor-pointer font-medium">Как добавить вручную</summary>
            <div className="mt-2 flex flex-col gap-3">
              <p className="font-medium">iPhone</p>
              <Steps
                items={[
                  <>Скопируйте ссылку-подписку.</>,
                  <>
                    «Настройки» → «Приложения» → «Календарь» → «Учётные записи» → «Новая учётная запись» → «Другое» → <b>«Подписной календарь»</b>.
                  </>,
                  <>Вставьте ссылку → «Далее» → «Сохранить».</>,
                ]}
              />
              <p className="font-medium">Google Календарь</p>
              <Steps
                items={[
                  <>
                    Откройте <b>calendar.google.com</b> в браузере (на телефоне — в Safari, «Полная версия сайта»).
                  </>,
                  <>
                    Слева «Другие календари» → <b>+</b> → <b>«Добавить по URL»</b>.
                  </>,
                  <>Вставьте ссылку → «Добавить календарь». В приложении Google Календарь он появится сам.</>,
                ]}
              />
              <p className="text-muted">
                iPhone обновляет подписку раз в час или реже, Google — раз в несколько часов. Это ограничение самих календарей.
              </p>
            </div>
          </details>
        </Card>

        <Card className="flex flex-col gap-3">
          <div>
            <h2 className="font-semibold">Google Календарь → на «Сегодня»</h2>
            <p className="text-sm text-muted">События вашего Google-календаря на сегодня и завтра будут видны на главном экране. Только вам.</p>
          </div>
          {imported && (
            <div className="rounded-2xl bg-card-muted p-3">
              {"error" in imported ? (
                <p className="text-sm text-danger">Календарь сейчас не открывается. Проверьте адрес или замените его ниже.</p>
              ) : (
                <>
                  <p className="mb-1 text-sm font-medium">Подключено. Сегодня:</p>
                  <CalendarEvents events={imported.events} empty="Событий нет" />
                </>
              )}
            </div>
          )}
          <Steps
            items={[
              <>
                Откройте <b>calendar.google.com</b> в браузере (на телефоне — Safari, «аА» → «Полная версия сайта»).
              </>,
              <>
                ⚙ «Настройки» → слева выберите свой календарь → раздел <b>«Интеграция календаря»</b>.
              </>,
              <>
                Скопируйте <b>«Секретный адрес в формате iCal»</b> и вставьте сюда.
              </>,
            ]}
          />
          <ImportForm connected={Boolean(link.importUrl)} />
          {link.importUrl && (
            <form action={removeImportUrl}>
              <button type="submit" className="min-h-11 w-full rounded-2xl text-sm font-semibold text-danger active:bg-card-muted">
                Отвязать Google Календарь
              </button>
            </form>
          )}
          <p className="text-xs text-muted">Подойдёт и ссылка на календарь iCloud («Общий доступ» → «Открытый календарь»).</p>
        </Card>

        {(link.hasFeed || link.importUrl) && (
          <form action={disconnectCalendar}>
            <button type="submit" className="min-h-12 w-full rounded-2xl bg-card font-semibold text-danger shadow-sm active:scale-[0.98]">
              Отключить всё
            </button>
          </form>
        )}
      </div>
    </>
  );
}
