import type { ScheduleDay } from "@/lib/party-types";
import { kickerClass, sectionTitleClass } from "@/lib/type";
import { cn } from "@/lib/utils";

export function ScheduleSection({ schedule }: { schedule: ScheduleDay[] }) {
  return (
    <section id="schedule" className="scroll-mt-20 py-12 sm:py-16">
      <h2 className={sectionTitleClass}>Schedule</h2>

      <div className="mx-auto mt-8 flex max-w-3xl flex-col">
        {schedule.map((day, dayIndex) => (
          <section key={day.key} aria-labelledby={`${day.key}-heading`}>
            <div
              id={`${day.key}-heading`}
              className="sticky top-14 z-10 -mx-4 border-b border-border bg-background px-4 py-3 sm:mx-0 sm:rounded-md sm:border"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-xs text-primary">
                  Day {String(dayIndex + 1).padStart(2, "0")}
                </span>
                <span className="text-lg font-semibold tracking-tight">{day.weekday}</span>
                <span className={kickerClass}>{formatDate(day.date)}</span>
                <span className="text-sm text-muted-foreground">{day.label}</span>
              </div>
              {!day.timed && (
                <p className={cn("mt-1", kickerClass)}>Order locked, times loose</p>
              )}
            </div>

            <ol className="relative border-l border-border py-6 pl-4 sm:pl-6">
              {day.entries.map((entry, entryIndex) => (
                <li key={`${day.key}-${entryIndex}`} className="relative pb-8 last:pb-0">
                  <span
                    className={
                      "absolute top-1 -left-[calc(1rem+3.5px)] size-[7px] rounded-full sm:-left-[calc(1.5rem+3.5px)] " +
                      (entry.marquee ? "bg-primary" : "bg-border")
                    }
                    aria-hidden
                  />
                  <div className="flex gap-4">
                    <div className="w-14 shrink-0 font-mono text-xs text-muted-foreground sm:w-20">
                      {day.timed ? entry.time : String(entryIndex + 1).padStart(2, "0")}
                    </div>
                    <div className="min-w-0">
                      <p className={"font-medium" + (entry.marquee ? " text-primary" : "")}>
                        {entry.title}
                      </p>
                      {entry.note && (
                        <p className="mt-0.5 text-sm text-muted-foreground">{entry.note}</p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </section>
  );
}

function formatDate(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
