import type { PartyContent } from "@/lib/party-types";

// Fictional placeholder party. Renders the full site locally or on a fresh
// deploy before any real party is seeded. Safe to publish.
export const DEMO_PARTY: PartyContent = {
  trip: {
    groomName: "Sam",
    siteName: "Sam's Big Send",
    tagline: "Sending Sam off in style — a long weekend in the mountains before the wedding",
    startDate: "2030-08-30",
    endDate: "2030-09-02",
    dateLabel: "Aug 30 – Sep 2, 2030",
    location: "Alpine Meadows, CO",
    coordinates: "39.0000° N, 106.0000° W",
    elevation: "9,000 ft",
    airport: "Denver International (DEN)",
  },
  lodging: {
    name: "Pinewood Lodge",
    url: "https://example.com/listing",
    address: "1 Lodge Road, Alpine Meadows, CO 80000",
    mapsUrl: "https://maps.google.com",
    bedrooms: 4,
    beds: 8,
    bathrooms: 3,
    totalCost: "$2,400.00",
    amenities: ["Hot tub", "Fire pit", "Grill", "Board games", "Full kitchen"],
    driveFromAirport: "~2 hr from the airport",
  },
  schedule: [
    {
      key: "friday",
      date: "2030-08-30",
      weekday: "Friday",
      label: "Arrival day",
      timed: true,
      entries: [
        { time: "11:00 AM", title: "Arrivals window", note: "Fly in by late morning" },
        { time: "12:00 PM", title: "Grocery run" },
        { time: "3:00 PM", title: "Check in at the lodge", marquee: true },
        { time: "7:00 PM", title: "Group dinner", marquee: true },
      ],
    },
    {
      key: "saturday",
      date: "2030-08-31",
      weekday: "Saturday",
      label: "Big day out",
      timed: false,
      entries: [
        { title: "Lodge breakfast" },
        { title: "Day activity", marquee: true },
        { title: "Dinner in town" },
        { title: "Cabin night" },
      ],
    },
    {
      key: "sunday",
      date: "2030-09-01",
      weekday: "Sunday",
      label: "Head home",
      timed: false,
      entries: [
        { title: "Pack up" },
        { title: "Drive to the airport" },
        { title: "Departures" },
      ],
    },
  ],
  activities: {
    core: [
      {
        slug: "day-activity",
        name: "Day activity",
        description: "The Saturday centerpiece.",
        options: [{ label: "Option A" }, { label: "Option B" }],
      },
    ],
    ifTimeAllows: [{ slug: "extra-one", name: "Bonus round" }],
    backups: [{ slug: "backup-one", name: "Rainy-day backup" }],
  },
  actionItems: [
    { title: "Book your flight", note: "Land Friday by late morning" },
    { title: "Drop your info below", note: "Flights, food, votes — two minutes", anchor: "#rsvp" },
    { title: "Settle up when the split lands" },
  ],
};
