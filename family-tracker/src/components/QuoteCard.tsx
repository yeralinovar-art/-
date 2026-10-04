"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { Heart, Quote as QuoteIcon, Share2 } from "lucide-react";
import { toggleFavorite } from "@/app/(app)/activity/actions";
import { Card, FamilyBadge } from "@/components/ui";

/** Цитата дня — одна на двоих. Избранное и «поделиться». */
export function QuoteCard({ id, text, author, favorite }: { id: string; text: string; author: string | null; favorite: boolean }) {
  const [, startTransition] = useTransition();
  const [fav, setFav] = useOptimistic(favorite);
  const [copied, setCopied] = useState(false);
  const full = author ? `«${text}» — ${author}` : `«${text}»`;

  function like() {
    const fd = new FormData();
    fd.set("quote_id", id);
    fd.set("favorite", fav ? "1" : "0");
    startTransition(async () => {
      setFav(!fav);
      await toggleFavorite(fd);
    });
  }

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ text: full });
        return;
      }
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // пользователь закрыл окно «поделиться»
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold">
          <QuoteIcon className="size-5 text-family" aria-hidden />
          Цитата дня
        </h2>
        <FamilyBadge label="Одна на двоих" />
      </div>
      <figure>
        <blockquote className="text-lg leading-snug">«{text}»</blockquote>
        {author && <figcaption className="mt-1 text-sm text-muted">— {author}</figcaption>}
      </figure>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={like}
          aria-pressed={fav}
          aria-label={fav ? "Убрать из избранного" : "В избранное"}
          className="flex size-10 items-center justify-center rounded-full bg-card-muted active:scale-95"
        >
          <Heart className={`size-5 ${fav ? "fill-family text-family" : "text-muted"}`} aria-hidden />
        </button>
        <button
          type="button"
          onClick={share}
          aria-label="Поделиться"
          className="flex size-10 items-center justify-center rounded-full bg-card-muted active:scale-95"
        >
          <Share2 className="size-5 text-muted" aria-hidden />
        </button>
        {copied && <span className="text-sm text-accent">Скопировано</span>}
        <Link href="/quotes" className="ml-auto text-sm font-medium text-accent">
          Избранное и свои →
        </Link>
      </div>
    </Card>
  );
}
