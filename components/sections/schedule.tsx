import type { ScheduleDay } from "@/lib/party-types";
import { KEY_EVENT_HINT, isKeyEvent, keyEventCount } from "@/lib/key-events";
import { nonemptySchedule } from "@/lib/trip-sections";
import { kickerClass, sectionTitleClass } from "@/lib/type";
import { cn } from "@/lib/utils";

export type SchedulePicker = {
  onToggle: (dayKey: string, entryIndex: number, key: boolean) => void;
  busy?: boolean;
};

export function ScheduleSection({
  schedule,
  picker,
  id = "schedule",
}: {
  schedule: ScheduleDay[];
  picker?: SchedulePicker;
  id?: string;
}) {
  const days = nonemptySchedule(schedule);
  if (days.length === 0) return null;

  return (
    <section id={id} className="scroll-mt-20 py-10 sm:py-12">
      <h2 className={sectionTitleClass}>{picker ? "Key events" : "Schedule"}</h2>
      {picker ? (
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">{KEY_EVENT_HINT}</p>
      ) : (
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">Highlighted entries are key events.</p>
      )}

      <div className="mx-auto mt-8 flex max-w-3xl flex-col">
        {days.map((day, dayIndex) => {
          const marked = keyEventCount(day.entries);
          const headingLabel = guestDayLabel(day);
          return (
            <section key={day.key} aria-labelledby={`${day.key}-heading`}>
              <div
                id={`${day.key}-heading`}
                className="sticky top-[3.75rem] z-10 -mx-4 border-b border-border bg-background px-4 py-3 sm:mx-0 sm:rounded-md sm:border"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-sm text-primary">
                    Day {String(dayIndex + 1).padStart(2, "0")}
                  </span>
                  <span className="text-lg font-semibold tracking-tight">{day.weekday}</span>
                  <span className={kickerClass}>{formatDate(day.date)}</span>
                  {headingLabel ? (
                    <span className={kickerClass}>{headingLabel}</span>
                  ) : null}
                  {picker && marked > 0 ? (
                    <span className="text-xs text-muted-foreground">
                      {marked} key event{marked === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </div>
                {!day.timed && (
                  <p className={cn("mt-1", kickerClass)}>Order is set — times may slip.</p>
                )}
              </div>

              <ol className="relative border-l border-border py-6 pl-4 sm:pl-6">
                {day.entries.map((entry, entryIndex) => {
                  const key = isKeyEvent(entry);
                  return (
                    <li key={`${day.key}-${entryIndex}`} className="relative pb-8 last:pb-0">
                      <span
                        className={
                          "absolute top-1 -left-[calc(1rem+3.5px)] size-[7px] rounded-full sm:-left-[calc(1.5rem+3.5px)] " +
                          (key ? "bg-primary" : "bg-border")
                        }
                        aria-hidden
                      />
                      <div className="flex gap-4">
                        <div
                          className={
                            "w-14 shrink-0 break-words font-mono text-sm sm:w-20 " +
                            (key ? "text-primary" : "text-muted-foreground")
                          }
                        >
                          {day.timed ? entry.time : String(entryIndex + 1).padStart(2, "0")}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={"font-medium" + (key ? " text-primary" : "")}>
                            {key && !picker ? (
                              <span className="mr-2 inline-flex rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                Key event
                              </span>
                            ) : null}
                            {entry.title}
                          </p>
                          {entry.note && (
                            <p className="mt-0.5 text-sm text-muted-foreground">{entry.note}</p>
                          )}
                        </div>
                        {picker ? (
                          <button
                            type="button"
                            className={cn(
                              "min-h-11 shrink-0 rounded-md border px-3 text-xs font-medium transition-colors",
                              key
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border text-muted-foreground hover:border-primary hover:text-primary",
                            )}
                            aria-pressed={key}
                            aria-label={
                              key
                                ? `Unmark ${entry.title} as a key event`
                                : `Mark ${entry.title} as a key event`
                            }
                            disabled={picker.busy}
                            onClick={() => picker.onToggle(day.key, entryIndex, !key)}
                          >
                            Key
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>
    </section>
  );
}

function formatDate(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Hide placeholder or weekday-duplicate labels so guests don't see "Plan" or "Friday Friday". */
function guestDayLabel(day: ScheduleDay): string | undefined {
  const label = day.label.trim();
  if (!label || /^plan$/i.test(label) || label.toLowerCase() === day.weekday.toLowerCase()) {
    return undefined;
  }
  return label;
}
