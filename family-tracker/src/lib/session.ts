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
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, family_id, display_name, avatar_emoji")
    .eq("id", user.id)
    .single<Profile>();
  if (!profile) return null;

  let family: Family | null = null;
  let partner: Profile | null = null;
  if (profile.family_id) {
    const [familyRes, partnerRes] = await Promise.all([
      supabase
        .from("families")
        .select("id, name, invite_code")
        .eq("id", profile.family_id)
        .single<Family>(),
      supabase
        .from("profiles")
        .select("id, family_id, display_name, avatar_emoji")
        .eq("family_id", profile.family_id)
        .neq("id", user.id)
        .maybeSingle<Profile>(),
    ]);
    family = familyRes.data;
    partner = partnerRes.data;
  }

  return { userId: user.id, email: user.email ?? "", profile, family, partner };
});

/** Для экранов приложения: нужен вход и семья. */
export async function requireFamilySession(): Promise<Session & { family: Family }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.family) redirect("/onboarding");
  return session as Session & { family: Family };
}
