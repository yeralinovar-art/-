import { PageHeader } from "@/components/PageHeader";
import { FamilyBadge } from "@/components/ui";
import type { Profile } from "@/lib/session";
import { MenuTabs } from "./MenuTabs";

export function MenuHeader({ profile, subtitle }: { profile: Profile; subtitle: string }) {
  return (
    <>
      <PageHeader title="Меню" subtitle={subtitle} profile={profile} badge={<FamilyBadge label="Видят оба" />} />
      <MenuTabs />
    </>
  );
}
