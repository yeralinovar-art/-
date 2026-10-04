import Link from "next/link";
import { Baby, CalendarClock, ChevronRight, Pill, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui";
import { childAge, upcomingVisits } from "@/lib/family-health";
import { dueDoses } from "@/lib/meds";
import { getChildren, getDoses, getMedications, getVisits } from "@/lib/meds-data";
import { requireFamilySession } from "@/lib/session";
import { todayKey } from "@/lib/time";
import { TasksTabs } from "../TasksTabs";

export const metadata = { title: "Здоровье семьи — Семья" };

function HubRow({ href, icon: Icon, title, hint }: { href: string; icon: LucideIcon; title: string; hint: string }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 py-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <Icon className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{title}</span>
          <span className="block truncate text-xs text-muted">{hint}</span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
      </Link>
    </li>
  );
}

export default async function HealthHubPage() {
  const today = todayKey();
  const [{ profile }, children, meds, doses, visits] = await Promise.all([
    requireFamilySession(),
    getChildren(),
    getMedications(),
    getDoses(today),
    getVisits(),
  ]);
  const due = dueDoses(meds, doses, today);
  const left = due.filter((d) => !d.taken).length;
  const next = upcomingVisits(visits, today, 60)[0];

  return (
    <>
      <PageHeader title="Дела" subtitle="Здоровье семьи" profile={profile} />
      <TasksTabs />
      <div className="flex flex-col gap-4">
        <Card>
          <h2 className="font-semibold">Здоровье семьи</h2>
          <ul className="flex flex-col divide-y divide-line">
            <HubRow
              href="/meds"
              icon={Pill}
              title="Витамины"
              hint={due.length ? (left ? `сегодня осталось ${left} из ${due.length}` : "сегодня всё принято") : "добавить по схеме врача"}
            />
            <HubRow
              href="/visits"
              icon={CalendarClock}
              title="Визиты и анализы"
              hint={next ? `ближайший: ${next.title}, ${next.visit_date.split("-").reverse().slice(0, 2).join(".")}` : "приёмы, УЗИ, анализы"}
            />
            {children.map((c) => (
              <HubRow
                key={c.id}
                href={`/kids/${c.id}`}
                icon={Baby}
                title={c.name}
                hint={[c.birth_date ? childAge(c.birth_date, today) : null, "рост, вес, прививки"].filter(Boolean).join(" · ")}
              />
            ))}
          </ul>
        </Card>

      </div>
    </>
  );
}
