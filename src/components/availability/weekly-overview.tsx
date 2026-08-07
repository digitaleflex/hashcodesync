import type { SlotInput } from "@/components/availability/shared";
import { DAY_SHORT } from "@/components/availability/constants";
import { cn } from "@/lib/utils";

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function WeeklyOverview({ grouped }: { grouped: Record<number, SlotInput[]> }) {
  const hours = Array.from({ length: 11 }, (_, i) => 8 + i); // 8h..18h
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-separate border-spacing-1">
        <caption className="sr-only">
          Disponibilités hebdomadaires par jour et par heure.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 bg-card text-xs font-medium text-muted-foreground" />
            {hours.map((h) => (
              <th
                key={h}
                scope="col"
                className="py-0.5 text-center text-[11px] font-medium text-muted-foreground"
              >
                {h}:00
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAY_SHORT.map((name, day) => {
            const slots = grouped[day] ?? [];
            return (
              <tr key={day}>
                <th
                  scope="row"
                  className="sticky left-0 bg-card pr-2 text-xs font-medium text-muted-foreground"
                >
                  {name}
                </th>
                {hours.map((hour) => {
                  const occupied = slots.some(
                    (s) =>
                      toMinutes(s.startTime) < (hour + 1) * 60 &&
                      toMinutes(s.endTime) > hour * 60
                  );
                  return (
                    <td
                      key={hour}
                      title={`${name} ${hour}h → ${hour + 1}h${occupied ? " · disponible" : ""}`}
                      className={cn(
                        "h-7 min-w-7 rounded-md text-center",
                        occupied
                          ? "bg-accent text-accent-foreground shadow-sm"
                          : "bg-muted/40"
                      )}
                    />
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}