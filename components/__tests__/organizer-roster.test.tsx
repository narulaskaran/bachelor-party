import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OrganizerRoster } from "@/components/organizer-roster";

describe("OrganizerRoster", () => {
  it("renders organizer-only travel and dietary details", () => {
    const html = renderToStaticMarkup(
      <OrganizerRoster
        guests={[
          {
            id: 7,
            name: "Mina",
            phone: "555-0100",
            arrivalFlight: "UA 1523",
            arrivalTime: "Fri 10:45 AM",
            departureFlight: "UA 887",
            departureTime: "Mon 3:15 PM",
            dietary: "Vegetarian, no nuts",
          },
        ]}
      />,
    );

    expect(html).toMatch(/guest roster/i);
    expect(html).toContain("Mina");
    expect(html).toContain("Arrival · UA 1523 · Fri 10:45 AM");
    expect(html).toContain("Departure · UA 887 · Mon 3:15 PM");
    expect(html).toContain("Vegetarian, no nuts");
    expect(html).toContain("Phone: 555-0100");
    expect(html).not.toMatch(/Driving/);
  });

  it("renders private RSVP counts, statuses, party size, and plus-one details", () => {
    const html = renderToStaticMarkup(
      <OrganizerRoster
        guests={[
          { id: 1, name: "Mina", attendanceStatus: "attending", partySize: 2, plusOneName: "Taylor" },
          { id: 2, name: "Sam", attendanceStatus: "maybe", partySize: 1 },
          { id: 3, name: "Lee", attendanceStatus: "not-attending", partySize: 0 },
        ]}
      />,
    );

    expect(html).toContain("Responses: 3");
    expect(html).toContain("Attending: 1");
    expect(html).toContain("Maybe: 1");
    expect(html).toContain("Not attending: 1");
    expect(html).toContain("Expected people: 3");
    expect(html).toContain("attending · 2 people");
    expect(html).toContain("Plus-one: Taylor");
    expect(html).not.toMatch(/Driving/);
  });
});