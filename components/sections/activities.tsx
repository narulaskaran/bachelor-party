import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HashFocusLink } from "@/components/hash-focus-link";
import type { Activity, PartyContent } from "@/lib/party-types";
import { nonemptyActivities } from "@/lib/trip-sections";
import { contentGroupClass, kickerClass, sectionTitleClass } from "@/lib/type";
import { cn } from "@/lib/utils";

export function ActivitiesSection({
  activities,
}: {
  activities: NonNullable<PartyContent["activities"]>;
}) {
  const core = nonemptyActivities(activities.core);
  const ifTimeAllows = nonemptyActivities(activities.ifTimeAllows);
  const backups = nonemptyActivities(activities.backups);

  if (core.length === 0 && ifTimeAllows.length === 0 && backups.length === 0) {
    return null;
  }

  return (
    <section id="activities" className="scroll-mt-20 py-10 sm:py-12">
      <h2 className={sectionTitleClass}>Activities</h2>

      {core.length > 0 ? (
        <div className="mt-8">
          <p className={kickerClass}>Locked in</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {core.map((activity) => (
              <CoreActivityCard key={activity.slug} activity={activity} />
            ))}
          </div>
        </div>
      ) : null}

      {ifTimeAllows.length > 0 ? (
        <div className={cn("mt-10 p-4 sm:p-5", contentGroupClass)}>
          <p className={kickerClass}>If time allows</p>
          <ul className="mt-4 flex flex-col gap-3">
            {ifTimeAllows.map((activity) => (
              <SimpleActivityRow key={activity.slug} activity={activity} />
            ))}
          </ul>
        </div>
      ) : null}

      {backups.length > 0 ? (
        <div className={cn("mt-10 p-4 sm:p-5", contentGroupClass)}>
          <p className={kickerClass}>Backups</p>
          <ul className="mt-4 flex flex-col gap-3">
            {backups.map((activity) => (
              <SimpleActivityRow key={activity.slug} activity={activity} />
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            <HashFocusLink
              href="#rsvp"
              focusId="rsvp"
              className="text-primary underline-offset-4 hover:underline"
            >
              Vote on these below.
            </HashFocusLink>
          </p>
        </div>
      ) : null}
    </section>
  );
}

function CoreActivityCard({ activity }: { activity: Activity }) {
  const hasMultipleOptions = (activity.options?.length ?? 0) > 1;

  return (
    <Card className="border border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold tracking-tight">{activity.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {activity.description && (
          <p className="text-sm text-muted-foreground">{activity.description}</p>
        )}
        {activity.options && activity.options.length > 0 && (
          <div>
            {hasMultipleOptions && (
              <p className={kickerClass}>Venue shortlist — final call pending</p>
            )}
            <ul className="mt-1.5 flex flex-col gap-1">
              {activity.options.map((option) => (
                <li key={option.label} className="text-sm">
                  {option.url ? (
                    <a
                      href={option.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-dotted underline-offset-4 hover:text-primary"
                    >
                      {option.label}
                    </a>
                  ) : (
                    option.label
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SimpleActivityRow({ activity }: { activity: Activity }) {
  return (
    <li className="border-b border-border pb-3 last:border-b-0 last:pb-0">
      <p className="font-medium text-muted-foreground">{activity.name}</p>
      {activity.description && (
        <p className="mt-0.5 text-sm text-muted-foreground">{activity.description}</p>
      )}
    </li>
  );
}
