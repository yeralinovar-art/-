"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { askClaude } from "@/lib/ai";
import { FoodEstimateSchema, sanitizeFoodItem, type FoodEstimateItem } from "@/lib/ai-schemas";
import { getHealthProfile, isMeal } from "@/lib/data";
import { isDate, str } from "@/lib/form";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { todayKey } from "@/lib/time";

export type EstimateState = { items?: FoodEstimateItem[]; comment?: string | null; error?: string };

const SYSTEM = `Ты помогаешь семье в Казахстане вести дневник питания. По описанию или фото оцени, что съедено: раздели на отдельные блюда и напитки, для каждого — вес или объём порции и КБЖУ на всю порцию.
Знай казахскую, узбекскую и русскую кухню (бешбармак, плов, лагман, манты, баурсаки, сорпа, куырдак и т. п.).
Если вес не указан — бери типичную домашнюю порцию. Напитки — в миллилитрах, остальное — в граммах. Кофеин указывай для кофе, чая, колы, энергетиков и шоколада.
Называй блюда коротко по-русски. Если на фото не еда или описание непонятно — верни пустой список и поясни в comment.`;

const PREGNANT = `Пользовательница беременна. В pregnancy_note коротко отмечай то, что при беременности не рекомендуется или ограничено: алкоголь, сырая или недожаренная рыба и мясо (суши, тартар, стейк с кровью), сырые и всмятку яйца, непастеризованные сыры и молоко, рыба с высоким содержанием ртути (акула, рыба-меч, королевская макрель, крупный тунец), печень в больших количествах, кофеин сверх меры. Без медицинских советов — только факт. Для остальных блюд pregnancy_note = null.`;

/** Оценка еды по тексту и/или фото — результат ещё не сохраняется, его подтверждает пользователь. */
export async function estimateFood(_prev: EstimateState, formData: FormData): Promise<EstimateState> {
  const session = await getSession();
  if (!session) return { error: "Нужно войти заново" };
  const text = str(formData, "text").slice(0, 1000);
  const photo = str(formData, "photo");
  if (!text && !photo) return { error: "Опишите, что съели, или добавьте фото" };
  if (photo && (!photo.startsWith("data:image/jpeg;base64,") || photo.length > 3_500_000)) return { error: "Не получилось прочитать фото" };

  const health = await getHealthProfile();
  const content: Parameters<typeof askClaude>[0]["content"] = [];
  if (photo) {
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: photo.slice("data:image/jpeg;base64,".length) } });
  }
  content.push({ type: "text", text: text ? `Что съедено: ${text}` : "Оцени, что на фото." });

  const result = await askClaude({
    kind: photo ? "food_photo" : "food_text",
    schema: FoodEstimateSchema,
    system: health.is_pregnant ? `${SYSTEM}\n\n${PREGNANT}` : `${SYSTEM}\npregnancy_note всегда null.`,
    content,
    effort: "low",
    maxTokens: 4000,
  });
  if (!result.ok) return { error: result.error };
  const items = result.data.items.slice(0, 15).map(sanitizeFoodItem);
  if (!items.length) return { error: result.data.comment ?? "Не удалось распознать еду. Опишите подробнее." };
  return { items, comment: result.data.comment };
}

/** Подтверждённые пользователем позиции — в дневник. */
export async function addEstimatedFood(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const meal = str(formData, "meal");
  const date = str(formData, "date") || todayKey();
  if (!isMeal(meal) || !isDate(date)) return;
  let raw: unknown;
  try {
    raw = JSON.parse(str(formData, "items") || "[]");
  } catch {
    return;
  }
  const parsed = FoodEstimateSchema.shape.items.safeParse(raw);
  if (!parsed.success || !parsed.data.length) return;
  const supabase = await createClient();
  await supabase.from("food_entries").insert(
    parsed.data.slice(0, 15).map((i) => {
      const s = sanitizeFoodItem(i);
      return {
        user_id: session.userId,
        entry_date: date,
        meal,
        food_id: null,
        name: `${s.name} ✨`,
        grams: s.grams,
        unit: s.unit,
        kcal: s.kcal,
        protein: s.protein,
        fat: s.fat,
        carbs: s.carbs,
        caffeine_mg: s.caffeine_mg,
      };
    }),
  );
  revalidatePath("/", "layout");
  redirect(date === todayKey() ? "/food" : `/food?date=${date}`);
}
