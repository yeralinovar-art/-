import { Stethoscope } from "lucide-react";
import type { ReactNode } from "react";

/** Мягкая подсказка «обсудите с врачом» — без медицинских советов. */
export function DoctorNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex gap-2 rounded-2xl bg-family-soft px-4 py-3 text-sm text-family">
      <Stethoscope className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
