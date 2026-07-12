import { z } from "zod";

// Mirrors lib/party-types.ts, used to validate content posted to the
// admin API (agents send arbitrary JSON — this is the actual gate).
const tripSchema = z.object({
  groomName: z.string().min(1),
  siteName: z.string().min(1),
  tagline: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  dateLabel: z.string().min(1),
  location: z.string().min(1),
  coordinates: z.string().min(1),
  elevation: z.string().min(1),
  airport: z.string().min(1),
});

const lodgingSchema = z.object({
  name: z.string().min(1),
  url: z.string().min(1),
  address: z.string().min(1),
  mapsUrl: z.string().min(1),
  bedrooms: z.number(),
  beds: z.number(),
  bathrooms: z.number(),
  totalCost: z.string().min(1),
  amenities: z.array(z.string()),
  driveFromAirport: z.string().min(1),
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
  trip: tripSchema,
  lodging: lodgingSchema,
  schedule: z.array(scheduleDaySchema),
  activities: z.object({
    core: z.array(activitySchema),
    ifTimeAllows: z.array(activitySchema),
    backups: z.array(activitySchema),
  }),
  actionItems: z.array(actionItemSchema),
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
