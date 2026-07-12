import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Activity, PartyContent } from "@/lib/party-types";

export function ActivitiesSection({
  activities,
}: {
  activities: PartyContent["activities"];
}) {
  return (
    <section id="activities" className="scroll-mt-20 border-t border-border py-12 sm:py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        The Menu
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
        Activities
      </h2>

      <div className="mt-8">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Locked In
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {activities.core.map((activity) => (
            <CoreActivityCard key={activity.slug} activity={activity} />
          ))}
        </div>
      </div>

      <div className="mt-10 border-t border-border pt-8">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          If Time Allows
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {activities.ifTimeAllows.map((activity) => (
            <SimpleActivityRow key={activity.slug} activity={activity} />
          ))}
        </ul>
      </div>

      <div className="mt-10 border-t border-border pt-8">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Backups
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {activities.backups.map((activity) => (
            <SimpleActivityRow key={activity.slug} activity={activity} />
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          <a href="#rsvp" className="text-primary underline-offset-4 hover:underline">
            Vote on these below.
          </a>
        </p>
      </div>
    </section>
  );
}

function CoreActivityCard({ activity }: { activity: Activity }) {
  const hasMultipleOptions = (activity.options?.length ?? 0) > 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg uppercase tracking-wide">
          {activity.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {activity.description && (
          <p className="text-sm text-muted-foreground">{activity.description}</p>
        )}
        {activity.options && activity.options.length > 0 && (
          <div>
            {hasMultipleOptions && (
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Venue shortlist — final call pending
              </p>
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
        <p className="mt-0.5 text-sm text-muted-foreground/80">{activity.description}</p>
      )}
    </li>
  );
}
