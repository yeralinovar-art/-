"use server";

import { revalidatePath } from "next/cache";
import { ACTIVITY_LEVELS } from "@/lib/health";
import { checkRange, error, isDate, num, ok, str, type FormMessageState } from "@/lib/form";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export async function saveHealthProfile(_prev: FormMessageState, formData: FormData): Promise<FormMessageState> {
  const session = await getSession();
  if (!session) return error("Нужно войти заново");

  const sex = str(formData, "sex");
  const birthDate = str(formData, "birth_date");
  const activity = str(formData, "activity_level");
  const goalDate = str(formData, "goal_date");
  const isPregnant = sex === "female" && formData.get("is_pregnant") === "on";
  const dueDate = str(formData, "due_date");

  const height = num(formData, "height_cm");
  const goalWeight = num(formData, "goal_weight_kg");
  const kcalOverride = num(formData, "kcal_target_override");
  const water = num(formData, "water_goal_ml");
  const preWeight = num(formData, "pre_pregnancy_weight_kg");
  const gainMin = num(formData, "gain_min_kg");
  const gainMax = num(formData, "gain_max_kg");
  const tri1 = num(formData, "tri1_bonus_kcal");
  const tri2 = num(formData, "tri2_bonus_kcal");
  const tri3 = num(formData, "tri3_bonus_kcal");
  const caffeine = num(formData, "caffeine_limit_mg");

  const problems = [
    sex && !["female", "male"].includes(sex) ? "Выберите пол" : null,
    birthDate && !isDate(birthDate) ? "Проверьте дату рождения" : null,
    !ACTIVITY_LEVELS.some((a) => a.value === activity) ? "Выберите уровень активности" : null,
    checkRange(height, 100, 250, "Рост"),
    checkRange(goalWeight, 30, 300, "Цель по весу"),
    goalDate && !isDate(goalDate) ? "Проверьте дату цели" : null,
    checkRange(kcalOverride, 800, 6000, "Норма калорий"),
    checkRange(water, 500, 6000, "Вода"),
    isPregnant && !isDate(dueDate) ? "Укажите предполагаемую дату родов" : null,
    checkRange(preWeight, 30, 300, "Вес до беременности"),
    checkRange(gainMin, 0, 40, "Набор от"),
    checkRange(gainMax, 0, 40, "Набор до"),
    gainMin !== null && gainMax !== null && gainMin > gainMax ? "Набор «от» больше, чем «до»" : null,
    checkRange(tri1, 0, 1500, "Надбавка I триместра"),
    checkRange(tri2, 0, 1500, "Надбавка II триместра"),
    checkRange(tri3, 0, 1500, "Надбавка III триместра"),
    checkRange(caffeine, 0, 1000, "Кофеин"),
  ].filter(Boolean);
  if (problems.length) return error(problems.join(". "));

  const supabase = await createClient();
  const { error: dbError } = await supabase.from("health_profiles").upsert({
    user_id: session.userId,
    sex: sex || null,
    birth_date: birthDate || null,
    height_cm: height,
    activity_level: activity,
    goal_weight_kg: goalWeight,
    goal_date: goalDate || null,
    kcal_target_override: kcalOverride,
    water_goal_ml: water ?? 2000,
    is_pregnant: isPregnant,
    due_date: isPregnant ? dueDate : null,
    pre_pregnancy_weight_kg: preWeight,
    gain_min_kg: gainMin,
    gain_max_kg: gainMax,
    tri1_bonus_kcal: tri1 ?? 0,
    tri2_bonus_kcal: tri2 ?? 340,
    tri3_bonus_kcal: tri3 ?? 450,
    caffeine_limit_mg: caffeine ?? 200,
  });
  if (dbError) return error(dbError.message);

  revalidatePath("/", "layout");
  return ok("Сохранено");
}
