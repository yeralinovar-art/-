import { createClient } from "@supabase/supabase-js";
import { buildHealthPayload, importSummary } from "@/lib/health-import";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/env";

// Приём данных из iOS-команды «Здоровье → Семья». Ключ — личный, создаётся в профиле;
// в базе хранится только его хэш, а функция health_import сама находит владельца.

function reply(status: number, text: string, extra: Record<string, unknown> = {}) {
  return Response.json({ ok: status === 200, message: text, ...extra }, { status });
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 50_000) return reply(413, "Слишком много данных");
  let body: Record<string, unknown> = {};
  if (raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) body = parsed;
      else return reply(400, "Ожидается JSON-словарь");
    } catch {
      return reply(400, "Ожидается JSON — в команде выберите «Запрос: JSON»");
    }
  }

  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  const key = (typeof body.key === "string" ? body.key : bearer ?? new URL(request.url).searchParams.get("key") ?? "").trim();
  if (!key) return reply(401, "Нет ключа — скопируйте его в приложении: Профиль → Apple Health");

  const payload = buildHealthPayload(body);
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc("health_import", { p_token: key, p_payload: payload });
  if (error) {
    if (error.code === "28000") return reply(401, "Ключ не подходит — создайте новый в приложении и вставьте в команду");
    if (error.code === "22008") return reply(400, "Дата вне диапазона: можно за последние 31 день");
    console.error("health-import", error.code, error.message);
    return reply(500, "Не получилось сохранить, попробуйте позже");
  }
  return reply(200, importSummary(payload), { date: (data as { date?: string } | null)?.date });
}
