import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { rosterTravelLines } from "@/lib/roster-travel";
import type { OrganizerVisibleRosterEntry } from "@/lib/roster-visibility";
import { summarizeRsvps } from "@/lib/rsvp-contract";
import { sectionTitleClass } from "@/lib/type";

export function OrganizerRoster({
  guests,
}: {
  guests: OrganizerVisibleRosterEntry[];
}) {
  const summary = summarizeRsvps(
    guests.map((guest) => ({
      attendanceStatus: guest.attendanceStatus ?? "attending",
      partySize: guest.partySize ?? 1,
    })),
  );

  return (
    <section className="mx-auto w-full min-w-0 max-w-5xl px-4 pb-12">
      <div className="border-t border-border pt-10">
        <h2 className={sectionTitleClass}>Guest roster</h2>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Organizer view. Guests only see names; flight and dietary details stay
          here.
        </p>
        <div aria-label="RSVP summary" className="mt-6 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
          <span>Responses: {summary.responses}</span>
          <span>Attending: {summary.attending}</span>
          <span>Maybe: {summary.maybe}</span>
          <span>Not attending: {summary.notAttending}</span>
          <span>Expected people: {summary.expectedPeople}</span>
        </div>

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
                  <p className="text-sm font-medium capitalize">
                    {guest.attendanceStatus?.replace("-", " ") ?? "attending"} · {guest.partySize ?? 1} {guest.partySize === 1 ? "person" : "people"}
                  </p>
                  {guest.plusOneName ? (
                    <p className="break-words text-xs text-muted-foreground">Plus-one: {guest.plusOneName}</p>
                  ) : null}
                  {guest.phone ? (
                    <p className="break-words text-xs text-muted-foreground">Phone: {guest.phone}</p>
                  ) : null}
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
