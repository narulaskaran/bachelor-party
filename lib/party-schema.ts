import { z } from "zod";
import { END_BEFORE_START_MESSAGE, isInvertedDateRange } from "@/lib/trip-dates";
import { isReservedSlug, RESERVED_SLUG_MESSAGE, RESERVED_SLUGS } from "@/lib/slug";

export { END_BEFORE_START_MESSAGE, isInvertedDateRange };

// Mirrors lib/party-types.ts, used to validate content posted to the
// admin API (agents send arbitrary JSON — this is the actual gate).
// Extra keys (including legacy `groomName`) are stripped. All trip
// fields except siteName are optional so a site can exist before lodging
// and flights are booked.

const tripSchema = z
  .object({
    siteName: z.string().min(1),
    tagline: z.string().min(1).optional(),
    startDate: z.string().min(1).optional(),
    endDate: z.string().min(1).optional(),
    dateLabel: z.string().min(1).optional(),
    location: z.string().min(1).optional(),
    coordinates: z.string().min(1).optional(),
    elevation: z.string().min(1).optional(),
    airport: z.string().min(1).optional(),
  })
  .refine((trip) => !isInvertedDateRange(trip.startDate, trip.endDate), {
    message: END_BEFORE_START_MESSAGE,
    path: ["endDate"],
  });

const lodgingSchema = z.object({
  name: z.string().min(1),
  url: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  mapsUrl: z.string().min(1).optional(),
  bedrooms: z.number().optional(),
  beds: z.number().optional(),
  bathrooms: z.number().optional(),
  totalCost: z.string().min(1).optional(),
  amenities: z.array(z.string()).optional(),
  driveFromAirport: z.string().min(1).optional(),
});

const scheduleEntrySchema = z.object({
  time: z.string().optional(),
  title: z.string().min(1),
  note: z.string().optional(),
  marquee: z
    .boolean()
    .optional()
    .describe("Key event. Emphasized on the guest timeline."),
});

const scheduleDaySchema = z.object({
  key: z.string().min(1),
  date: z.string().min(1),
  weekday: z.string().min(1),
  label: z.string().min(1),
  timed: z.boolean(),
  entries: z.array(scheduleEntrySchema),
});

const activitySchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  options: z
    .array(z.object({ label: z.string().min(1), url: z.string().optional() }))
    .optional(),
});

const actionItemSchema = z.object({
  title: z.string().min(1),
  note: z.string().optional(),
  anchor: z.string().optional(),
});

const packingItemSchema = z.object({
  title: z.string().min(1),
  note: z.string().optional(),
});

export const partyContentSchema = z.object({
  kind: z.literal("trip").optional(),
  trip: tripSchema,
  lodging: lodgingSchema.optional(),
  schedule: z.array(scheduleDaySchema).optional(),
  activities: z
    .object({
      core: z.array(activitySchema).optional(),
      ifTimeAllows: z.array(activitySchema).optional(),
      backups: z.array(activitySchema).optional(),
    })
    .optional(),
  actionItems: z.array(actionItemSchema).optional(),
  packing: z.array(packingItemSchema).optional(),
});

const slugSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug must be lowercase-kebab-case")
  .refine((value) => !isReservedSlug(value), { message: RESERVED_SLUG_MESSAGE })
  .describe(
    `Lowercase kebab-case. Cannot be a reserved app route: ${RESERVED_SLUGS.join(", ")}.`,
  );

export const createPartySchema = z.object({
  slug: slugSchema.optional(),
  password: z.string().min(4).max(200).optional(),
  content: partyContentSchema,
});

export const updatePartySchema = z.object({
  password: z.string().min(4).max(200).optional(),
  // Content is a JSON Merge Patch, not a full PartyContent document.
  content: z.record(z.string(), z.unknown()).optional(),
});
