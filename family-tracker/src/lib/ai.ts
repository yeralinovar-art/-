import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { MOCKS } from "@/lib/ai-mocks";

// Обращения к Claude: только на сервере, ключ — из переменной окружения ANTHROPIC_API_KEY.

const MODEL = "claude-opus-5-5";

export type AiKind = "food_text" | "menu" | "swap";

/** Сколько обращений в день на человека — защита от случайно большого счёта. */
export const DAILY_LIMITS: Record<AiKind, number> = { food_text: 40, menu: 5, swap: 20 };

export type AiResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** AI включён, когда в окружении есть ключ (или тестовый режим для автотестов). */
export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY) || process.env.AI_MOCK === "1";
}

async function checkLimit(kind: AiKind): Promise<string | null> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await supabase
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("kind", kind)
    .gte("created_at", since);
  return (count ?? 0) >= DAILY_LIMITS[kind] ? `Лимит на сегодня исчерпан (${DAILY_LIMITS[kind]} в сутки). Попробуйте завтра.` : null;
}

async function logUsage(kind: AiKind, usage: { input_tokens?: number | null; output_tokens?: number | null } | null) {
  const supabase = await createClient();
  await supabase
    .from("ai_usage")
    .insert({ kind, input_tokens: usage?.input_tokens ?? null, output_tokens: usage?.output_tokens ?? null });
}

/**
 * Один запрос к Claude со структурированным ответом по схеме.
 * Стрим + finalMessage — чтобы длинные ответы (меню на неделю) не упирались в таймаут.
 * fallbacks: "default" — если модель откажет по правилам безопасности, сервер сам повторит
 * запрос на подходящей запасной модели.
 */
export async function askClaude<S extends z.ZodType>(opts: {
  kind: AiKind;
  schema: S;
  system: string;
  content: Anthropic.Beta.BetaContentBlockParam[];
  effort: "low" | "medium" | "high";
  maxTokens: number;
}): Promise<AiResult<z.infer<S>>> {
  if (!aiEnabled()) return { ok: false, error: "AI пока не подключён — нужен ключ Claude API (см. инструкцию)." };
  const limited = await checkLimit(opts.kind);
  if (limited) return { ok: false, error: limited };

  if (process.env.AI_MOCK === "1") {
    await logUsage(opts.kind, null);
    return { ok: true, data: opts.schema.parse(MOCKS[opts.kind]) };
  }

  try {
    const client = new Anthropic();
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: opts.maxTokens,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: opts.effort, format: betaZodOutputFormat(opts.schema) },
      system: opts.system,
      messages: [{ role: "user", content: opts.content }],
    });
    const message = await stream.finalMessage();
    await logUsage(opts.kind, message.usage);

    if (message.stop_reason === "refusal") return { ok: false, error: "AI отказался отвечать на этот запрос. Попробуйте описать иначе." };
    if (message.stop_reason === "max_tokens") return { ok: false, error: "Ответ получился слишком длинным. Попробуйте упростить запрос." };
    if (!message.parsed_output) return { ok: false, error: "Не удалось разобрать ответ AI. Попробуйте ещё раз." };
    return { ok: true, data: message.parsed_output as z.infer<S> };
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return { ok: false, error: "Ключ Claude API не подходит — проверьте его в настройках Vercel." };
    if (e instanceof Anthropic.PermissionDeniedError) return { ok: false, error: "Нет доступа к модели — проверьте ключ и баланс в консоли Anthropic." };
    if (e instanceof Anthropic.RateLimitError) return { ok: false, error: "AI сейчас перегружен. Попробуйте через минуту." };
    if (e instanceof Anthropic.BadRequestError) {
      console.error("AI bad request:", e.message);
      return { ok: false, error: e.message.includes("credit") ? "На счёте Anthropic закончились средства." : "AI не принял запрос. Попробуйте ещё раз." };
    }
    if (e instanceof Anthropic.APIError) {
      console.error("AI API error:", e.status, e.message);
      return { ok: false, error: "AI временно недоступен. Попробуйте позже." };
    }
    console.error("AI error:", e);
    return { ok: false, error: "Что-то пошло не так. Попробуйте ещё раз." };
  }
}
