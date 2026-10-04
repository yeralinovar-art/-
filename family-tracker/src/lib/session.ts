import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  family_id: string | null;
  display_name: string;
  avatar_emoji: string;
};

export type Family = {
  id: string;
  name: string;
  invite_code: string;
};

export type Session = {
  userId: string;
  email: string;
  profile: Profile;
  family: Family | null;
  partner: Profile | null;
};

/** Текущий пользователь, его семья и партнёр. Кэшируется на время одного запроса. */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();
  // getClaims проверяет подпись токена локально, без похода на сервер Supabase.
  const { data: auth } = await supabase.auth.getClaims();
  const claims = auth?.claims;
  if (!claims?.sub) return null;

  // Один запрос вместо трёх: RLS отдаёт только мой профиль и профиль партнёра,
  // семья подтягивается через внешний ключ family_id.
  const { data: rows } = await supabase
    .from("profiles")
    .select("id, family_id, display_name, avatar_emoji, families(id, name, invite_code)")
    .returns<(Profile & { families: Family | null })[]>();

  const toProfile = (r: Profile & { families: Family | null }): Profile => ({
    id: r.id,
    family_id: r.family_id,
    display_name: r.display_name,
    avatar_emoji: r.avatar_emoji,
  });
  const mine = rows?.find((r) => r.id === claims.sub);
  if (!mine) return null;
  const partnerRow = mine.family_id
    ? rows?.find((r) => r.id !== claims.sub && r.family_id === mine.family_id)
    : undefined;

  return {
    userId: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
    profile: toProfile(mine),
    family: mine.family_id ? mine.families : null,
    partner: partnerRow ? toProfile(partnerRow) : null,
  };
});

/** Для экранов приложения: нужен вход и семья. */
export async function requireFamilySession(): Promise<Session & { family: Family }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.family) redirect("/onboarding");
  return session as Session & { family: Family };
}
