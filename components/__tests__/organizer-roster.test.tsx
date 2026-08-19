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
  });
});