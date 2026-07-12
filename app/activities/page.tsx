import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ACTIVITIES, type Activity } from "@/lib/party";

export default function Page() {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-16">
      <div className="border-b border-border py-10">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          The Menu
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold uppercase tracking-wide sm:text-5xl">
          Activities
        </h1>
      </div>

      <section className="py-10">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Locked In
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {ACTIVITIES.core.map((activity) => (
            <CoreActivityCard key={activity.slug} activity={activity} />
          ))}
        </div>
      </section>

      <section className="border-t border-border py-10">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          If Time Allows
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {ACTIVITIES.ifTimeAllows.map((activity) => (
            <SimpleActivityRow key={activity.slug} activity={activity} />
          ))}
        </ul>
      </section>

      <section className="border-t border-border py-10">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Backups
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {ACTIVITIES.backups.map((activity) => (
            <SimpleActivityRow key={activity.slug} activity={activity} />
          ))}
        </ul>
      </section>

      <div className="mt-6 flex flex-col items-start gap-3 border border-border p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Have opinions? Vote on the maybes in your RSVP.
        </p>
        <Button asChild>
          <Link href="/rsvp">Go to RSVP</Link>
        </Button>
      </div>
    </div>
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
        <p className="mt-0.5 text-sm text-muted-foreground/80">
          {activity.description}
        </p>
      )}
    </li>
  );
}
