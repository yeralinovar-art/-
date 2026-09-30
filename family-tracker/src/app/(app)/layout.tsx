import { BottomNav } from "@/components/BottomNav";
import { QuickAdd } from "@/components/QuickAdd";
import { SetupNotice } from "@/components/SetupNotice";
import { isSupabaseConfigured } from "@/lib/env";
import { requireFamilySession } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  if (!isSupabaseConfigured) {
    return (
      <main className="pt-safe mx-auto max-w-md px-5 py-10">
        <SetupNotice />
      </main>
    );
  }

  await requireFamilySession();

  return (
    <>
      <main
        className="pt-safe mx-auto max-w-md px-4"
        style={{ paddingBottom: "calc(9rem + env(safe-area-inset-bottom))" }}
      >
        {children}
      </main>
      <QuickAdd />
      <BottomNav />
    </>
  );
}
