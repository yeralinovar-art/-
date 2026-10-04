import { X } from "lucide-react";
import { BackHeader } from "@/components/BackHeader";
import { QuoteCard } from "@/components/QuoteCard";
import { Card, FamilyBadge } from "@/components/ui";
import { quoteOfDay } from "@/lib/activity";
import { getFavoriteIds, getQuotes } from "@/lib/activity-data";
import { requireFamilySession } from "@/lib/session";
import { todayKey } from "@/lib/time";
import { deleteQuote, toggleFavorite } from "../activity/actions";
import { QuoteForm } from "./QuoteForm";

export const metadata = { title: "Цитаты — Семья" };

export default async function QuotesPage() {
  const [, quotes, favs] = await Promise.all([requireFamilySession(), getQuotes(), getFavoriteIds()]);
  const today = quoteOfDay(quotes, todayKey());
  const favorites = quotes.filter((q) => favs.has(q.id));
  const own = quotes.filter((q) => q.ord === null).sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <>
      <BackHeader href="/" title="Цитаты" />
      <div className="flex flex-col gap-4">
        {today && <QuoteCard id={today.id} text={today.text} author={today.author} favorite={favs.has(today.id)} />}

        <Card>
          <h2 className="mb-1 font-semibold">Избранное · {favorites.length}</h2>
          {favorites.length ? (
            <ul className="flex flex-col divide-y divide-line">
              {favorites.map((q) => (
                <li key={q.id} className="flex items-start gap-2 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block">«{q.text}»</span>
                    {q.author && <span className="block text-xs text-muted">— {q.author}</span>}
                  </span>
                  <form action={toggleFavorite}>
                    <input type="hidden" name="quote_id" value={q.id} />
                    <input type="hidden" name="favorite" value="1" />
                    <button aria-label="Убрать из избранного" className="flex size-8 items-center justify-center rounded-full text-muted active:bg-card-muted">
                      <X className="size-4" aria-hidden />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Нажмите ♡ на цитате дня — она сохранится здесь.</p>
          )}
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 font-semibold">
            Наши цитаты <FamilyBadge label="Видят оба" />
          </h2>
          {own.length > 0 && (
            <ul className="flex flex-col divide-y divide-line">
              {own.map((q) => (
                <li key={q.id} className="flex items-start gap-2 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block">«{q.text}»</span>
                    {q.author && <span className="block text-xs text-muted">— {q.author}</span>}
                  </span>
                  <form action={deleteQuote}>
                    <input type="hidden" name="id" value={q.id} />
                    <button aria-label="Удалить цитату" className="flex size-8 items-center justify-center rounded-full text-muted active:bg-card-muted">
                      <X className="size-4" aria-hidden />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <QuoteForm />
          <p className="text-xs text-muted">В базе {quotes.length} цитат и пословиц. Цитата дня меняется в полночь и одна на двоих; свои цитаты попадают в очередь примерно раз в 4 дня.</p>
        </Card>
      </div>
    </>
  );
}
