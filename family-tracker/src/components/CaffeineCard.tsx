import { Coffee } from "lucide-react";
import { addDrink } from "@/app/(app)/food/actions";
import { Card, ProgressBar } from "@/components/ui";

// Частые напитки — добавляются в дневник стандартной порцией из справочника.
const DRINKS: { name: string; label: string }[] = [
  { name: "Кофе с молоком", label: "Кофе с молоком" },
  { name: "Кофе американо", label: "Американо" },
  { name: "Капучино", label: "Капучино" },
  { name: "Латте", label: "Латте" },
  { name: "Чай чёрный", label: "Чай чёрный" },
  { name: "Чай зелёный", label: "Чай зелёный" },
];

export function CaffeineCard({ mg, limit, date }: { mg: number; limit: number; date: string }) {
  const over = mg > limit;
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 font-semibold">
        <Coffee className="size-5 text-family" aria-hidden />
        Кофеин
        <span className={`ml-auto text-sm font-normal ${over ? "text-danger" : "text-muted"}`}>
          {Math.round(mg)} из {limit} мг
        </span>
      </h2>
      <ProgressBar value={mg} max={limit} tone={over ? "danger" : "family"} />
      {over && <p className="text-sm text-danger">Больше дневного лимита. Дальше лучше без кофеина.</p>}
      <div className="flex flex-wrap gap-2">
        {DRINKS.map((d) => (
          <form key={d.name} action={addDrink}>
            <input type="hidden" name="name" value={d.name} />
            <input type="hidden" name="date" value={date} />
            <button
              type="submit"
              className="min-h-10 rounded-full bg-family-soft px-3.5 text-sm font-medium text-family transition active:scale-95"
            >
              + {d.label}
            </button>
          </form>
        ))}
      </div>
      <p className="text-xs text-muted">
        Чашка 250 мл. Другой объём или напиток — через «+» → Еда, поиск «кофе» или «чай».
      </p>
    </Card>
  );
}
