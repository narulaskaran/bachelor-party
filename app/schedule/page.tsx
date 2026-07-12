import { SCHEDULE, TRIP } from "@/lib/party";

// Marquee stops get a single ember marker — keep this list short and deliberate.
const MARQUEE_TITLES = new Set([
  "Sporting clays at Kiowa Creek",
  "Group dinner in Denver",
  "Field day / bachelor Olympics",
  "Half-day whitewater rafting",
  "Mt. Princeton Hot Springs",
]);

function isMarquee(title: string) {
  return MARQUEE_TITLES.has(title);
}

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16">
      <div className="border-b border-border py-10">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          The Itinerary
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold uppercase tracking-wide sm:text-5xl">
          Schedule
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{TRIP.dateLabel}</p>
      </div>

      <div className="flex flex-col">
        {SCHEDULE.map((day, dayIndex) => (
          <section key={day.key} aria-labelledby={`${day.key}-heading`}>
            <div
              id={`${day.key}-heading`}
              className="sticky top-14 z-10 -mx-4 border-b border-border bg-background px-4 py-3 sm:mx-0 sm:rounded-md sm:border"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-mono text-xs uppercase tracking-widest text-primary">
                  Day {String(dayIndex + 1).padStart(2, "0")}
                </span>
                <span className="font-display text-lg font-bold uppercase tracking-wide">
                  {day.weekday}
                </span>
                <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  {formatDate(day.date)}
                </span>
                <span className="text-sm text-muted-foreground">{day.label}</span>
              </div>
              {!day.timed && (
                <p className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  Order locked, times loose
                </p>
              )}
            </div>

            <ol className="relative border-l border-border py-6 pl-4 sm:pl-6">
              {day.entries.map((entry, entryIndex) => {
                const marquee = isMarquee(entry.title);
                return (
                  <li
                    key={`${day.key}-${entryIndex}`}
                    className="relative pb-8 last:pb-0"
                  >
                    <span
                      className={
                        "absolute top-1 -left-[calc(1rem+3.5px)] size-[7px] rounded-full sm:-left-[calc(1.5rem+3.5px)] " +
                        (marquee ? "bg-primary" : "bg-border")
                      }
                      aria-hidden
                    />
                    <div className="flex gap-4">
                      <div className="w-14 shrink-0 font-mono text-xs uppercase tracking-widest text-muted-foreground sm:w-20">
                        {day.timed
                          ? entry.time
                          : String(entryIndex + 1).padStart(2, "0")}
                      </div>
                      <div className="min-w-0">
                        <p className={"font-medium" + (marquee ? " text-primary" : "")}>
                          {entry.title}
                        </p>
                        {entry.note && (
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {entry.note}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  return date
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
}
