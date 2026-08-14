import { z } from "zod";

// Mirrors lib/party-types.ts, used to validate content posted to the
// admin API (agents send arbitrary JSON — this is the actual gate).
// Extra keys (including legacy `groomName`) are stripped. All trip
// fields except siteName are optional so a site can exist before lodging
// and flights are booked.

const tripSchema = z.object({
  siteName: z.string().min(1),
  tagline: z.string().min(1).optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  dateLabel: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  coordinates: z.string().min(1).optional(),
  elevation: z.string().min(1).optional(),
  airport: z.string().min(1).optional(),
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
  marquee: z.boolean().optional(),
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
});

const slugSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug must be lowercase-kebab-case");

export const createPartySchema = z.object({
  slug: slugSchema,
  password: z.string().min(4).max(200),
  content: partyContentSchema,
});

export const updatePartySchema = z.object({
  password: z.string().min(4).max(200).optional(),
  content: partyContentSchema.optional(),
});
