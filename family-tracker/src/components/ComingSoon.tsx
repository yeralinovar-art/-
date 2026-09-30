import { Card } from "@/components/ui";

export type Planned = { title: string; stage: number; shared?: boolean };

/** Заглушка раздела: что здесь появится и на каком этапе. */
export function ComingSoon({ items }: { items: Planned[] }) {
  return (
    <Card>
      <h2 className="mb-3 font-semibold">Скоро здесь</h2>
      <ul className="flex flex-col divide-y divide-line">
        {items.map((item) => (
          <li key={item.title} className="flex items-center justify-between gap-3 py-3">
            <span className="flex items-center gap-2">
              {item.title}
              {item.shared && (
                <span className="size-2 shrink-0 rounded-full bg-family" aria-label="общее" />
              )}
            </span>
            <span className="shrink-0 rounded-full bg-card-muted px-2.5 py-1 text-xs text-muted">
              этап {item.stage}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
