import type { PartyContent } from "@/lib/party-types";

// Fictional placeholder trip. Always served at `/demo` locally and in
// production (even when DATABASE_URL is set, and even if a leftover
// `slug=demo` row exists). Safe to publish.
export const DEMO_RSVP_MESSAGE =
  "Demo mode — this sample trip doesn't save RSVPs.";

export const DEMO_PARTY: PartyContent = {
  kind: "trip",
  trip: {
    siteName: "Alpine Weekend",
    tagline: "A long weekend in the mountains — cabin, trail, and a group dinner",
    startDate: "2030-08-30",
    endDate: "2030-09-02",
    dateLabel: "Aug 30 – Sep 2, 2030",
    location: "Alpine Meadows, CO",
    coordinates: "39.0000° N, 106.0000° W",
    elevation: "9,000 ft",
    airport: "Denver International (DEN)",
    timezone: "America/Denver",
  },
  lodging: {
    name: "Pinewood Lodge",
    address: "1 Lodge Road, Alpine Meadows, CO 80000",
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent("1 Lodge Road, Alpine Meadows, CO"),
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
      label: "Last full day",
      timed: false,
      entries: [
        { title: "Pack up" },
        { title: "Final cabin morning" },
        { title: "Free afternoon" },
      ],
    },
    {
      key: "monday",
      date: "2030-09-02",
      weekday: "Monday",
      label: "Departure day",
      timed: false,
      entries: [
        { title: "Check out" },
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
    { title: "RSVP below", note: "Flights, food, votes — two minutes", anchor: "#rsvp" },
    { title: "Pack the list", note: "ID, layers, shoes — check them off as you go", anchor: "#pack" },
    { title: "Settle up when the split lands" },
  ],
  packing: [
    { title: "Government ID" },
    { title: "Layers", note: "Nights drop below 40" },
    { title: "Hiking shoes" },
    { title: "Warm jacket" },
    { title: "Sunscreen", note: "9,000 ft" },
    { title: "Refillable bottle" },
  ],
};
