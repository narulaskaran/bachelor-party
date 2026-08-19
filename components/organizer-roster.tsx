import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { rosterTravelLines } from "@/lib/roster-travel";
import type { OrganizerVisibleRosterEntry } from "@/lib/roster-visibility";
import { sectionTitleClass } from "@/lib/type";

export function OrganizerRoster({
  guests,
}: {
  guests: OrganizerVisibleRosterEntry[];
}) {
  return (
    <section className="mx-auto w-full min-w-0 max-w-5xl px-4 pb-12">
      <div className="border-t border-border pt-10">
        <h2 className={sectionTitleClass}>Guest roster</h2>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Organizer view. Guests only see names; flight and dietary details stay
          here.
        </p>

        {guests.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">No RSVPs yet.</p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {guests.map((guest) => (
              <Card key={guest.id}>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold tracking-tight">
                    {guest.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {rosterTravelLines(guest).map((line) => (
                    <p
                      key={line}
                      className="break-words text-xs text-muted-foreground"
                    >
                      {line}
                    </p>
                  ))}
                  {guest.dietary ? (
                    <Badge variant="outline" className="mt-2 h-auto px-2 py-1 text-xs">
                      {guest.dietary}
                    </Badge>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
