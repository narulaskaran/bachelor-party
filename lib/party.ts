// Single source of truth for trip logistics.
// Edit this file to update the site — no database involved.

export const TRIP = {
  groomName: "Hemil",
  title: "Hemil's Bachelor Party",
  tagline: "Labor Day weekend in the Colorado Rockies",
  startDate: "2026-09-04",
  endDate: "2026-09-07",
  dateLabel: "Sep 4–7, 2026",
  location: "Tabernash, Colorado",
  coordinates: "39.9942° N, 105.8494° W",
  elevation: "8,340 ft",
  airport: "Denver International (DEN)",
} as const;

export const LODGING = {
  name: "Home in Tabernash",
  url: "https://www.airbnb.com/rooms/1475570657604389291",
  address: "75 Purple Sage Court, Tabernash, CO 80478",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=75+Purple+Sage+Court+Tabernash+CO+80478",
  bedrooms: 5,
  beds: 9,
  bathrooms: 6.5,
  totalCost: "$3,390.86",
  amenities: [
    "Hot tub",
    "Cold plunge",
    "Heated deck",
    "Movie room",
    "Ping pong",
    "Foosball",
    "Board games",
    "Full kitchen",
    "Grill",
    "Fire pit",
  ],
  driveFromDen: "~1 hr 45 min from DEN over Berthoud Pass",
} as const;

export type ScheduleEntry = {
  time?: string; // "2:30 PM" — omit when timing is still loose
  title: string;
  note?: string;
};

export type ScheduleDay = {
  key: string;
  date: string; // ISO
  weekday: string;
  label: string; // short theme for the day
  timed: boolean; // false = ordered plan, times TBD
  entries: ScheduleEntry[];
};

export const SCHEDULE: ScheduleDay[] = [
  {
    key: "friday",
    date: "2026-09-04",
    weekday: "Friday",
    label: "Land in Denver",
    timed: true,
    entries: [
      { time: "11:00 AM", title: "Early arrivals window", note: "Fly into DEN" },
      { time: "11:30 AM", title: "Rental car pickups" },
      { time: "12:00 PM", title: "Costco run / groceries" },
      { time: "12:30 PM", title: "Cooler + ice", note: "12h cold storage for the drive" },
      { time: "2:30 PM", title: "Sporting clays at Kiowa Creek" },
      { time: "5:30 PM", title: "Brewery hop" },
      { time: "6:00 PM", title: "Board games" },
      { time: "6:30 PM", title: "Billiards" },
      { time: "8:00 PM", title: "Group dinner in Denver" },
      { time: "10:00 PM", title: "Drive to the Airbnb, check in" },
    ],
  },
  {
    key: "saturday",
    date: "2026-09-05",
    weekday: "Saturday",
    label: "Basecamp day",
    timed: false,
    entries: [
      { title: "Airbnb breakfast" },
      { title: "Field day / bachelor Olympics", note: "Beer dye, football, slacklining, disc golf" },
      { title: "Breckenridge — brewery, games, dinner" },
      { title: "Cabin night" },
    ],
  },
  {
    key: "sunday",
    date: "2026-09-06",
    weekday: "Sunday",
    label: "Adventure day",
    timed: false,
    entries: [
      { title: "Drive to Browns Canyon" },
      { title: "Half-day whitewater rafting" },
      { title: "Mt. Princeton Hot Springs" },
      { title: "Dinner on the road" },
      { title: "Drive back to the cabin" },
    ],
  },
  {
    key: "monday",
    date: "2026-09-07",
    weekday: "Monday",
    label: "Head home",
    timed: false,
    entries: [
      { title: "Pack up, clean out the fridge" },
      { title: "Drive to DEN", note: "Leave buffer — holiday traffic over Berthoud Pass" },
      { title: "Departures" },
    ],
  },
];

export type Activity = {
  slug: string;
  name: string;
  description?: string;
  options?: { label: string; url?: string }[];
};

export const ACTIVITIES: {
  core: Activity[];
  ifTimeAllows: Activity[];
  backups: Activity[];
} = {
  core: [
    {
      slug: "sporting-clays",
      name: "Sporting clays",
      description: "Shotguns and flying discs. Friday afternoon near Denver.",
      options: [
        { label: "Sporting Clays – Kiowa Creek", url: "https://kiowacreeksportingclub.com" },
        { label: "Colorado Clays Shooting Park", url: "https://coloradoclays.com" },
      ],
    },
    {
      slug: "rafting",
      name: "Whitewater rafting",
      description: "Half-day run through Browns Canyon on Sunday.",
      options: [
        { label: "Clear Creek Rafting", url: "https://clearcreekrafting.com" },
        { label: "Liquid Descent", url: "https://liquiddescent.com" },
      ],
    },
    {
      slug: "hike",
      name: "Mountain hike",
      description: "One good alpine hike if the legs allow.",
      options: [
        { label: "Emerald Lake Trail", url: "https://www.alltrails.com/trail/us/colorado/emerald-lake-trail" },
        { label: "Sky Pond via Glacier Gorge", url: "https://www.alltrails.com/trail/us/colorado/sky-pond-via-glacier-gorge-trail" },
        { label: "Lake Haiyaha", url: "https://www.alltrails.com/trail/us/colorado/lake-haiyaha-trail" },
        { label: "Saint Mary's Glacier", url: "https://www.alltrails.com/trail/us/colorado/saint-marys-glacier" },
      ],
    },
    {
      slug: "field-day",
      name: "Field day",
      description: "Beer dye, football, bachelor Olympics, slacklining, disc golf. At the cabin Saturday.",
    },
    {
      slug: "hot-springs",
      name: "Hot springs",
      description: "Post-rafting soak on Sunday.",
      options: [
        { label: "Mt. Princeton Hot Springs Resort", url: "https://mtprinceton.com" },
        { label: "Iron Mountain Hot Springs", url: "https://ironmountainhotsprings.com" },
        { label: "Glenwood Hot Springs Resort", url: "https://www.hotspringspool.com" },
      ],
    },
  ],
  ifTimeAllows: [
    { slug: "aerial-trekking", name: "Aerial trekking course" },
    { slug: "brewery-night", name: "Brewery / billiards / bowling / board games" },
    { slug: "fly-fishing", name: "Guided fly fishing" },
  ],
  backups: [
    { slug: "atv-tour", name: "ATV / Jeep tour" },
    { slug: "go-karting", name: "Go karting" },
    { slug: "mtb-tour", name: "Mountain biking tour" },
  ],
};

// Activities the boys vote on in the RSVP form (core are locked in).
export const POLL_ACTIVITIES: Activity[] = [
  ...ACTIVITIES.ifTimeAllows,
  ...ACTIVITIES.backups,
];
