import { z } from "zod";
import {
  END_BEFORE_START_MESSAGE,
  INVALID_CALENDAR_DATE_MESSAGE,
  isInvertedDateRange,
  isValidCalendarDate,
} from "@/lib/trip-dates";
import { isReservedSlug, RESERVED_SLUG_MESSAGE, RESERVED_SLUGS } from "@/lib/slug";

export {
  END_BEFORE_START_MESSAGE,
  INVALID_CALENDAR_DATE_MESSAGE,
  isInvertedDateRange,
  isValidCalendarDate,
};

// Mirrors lib/party-types.ts, used to validate content posted to the
// admin API (agents send arbitrary JSON — this is the actual gate).
// Extra keys (including legacy `groomName`) are stripped. All trip
// fields except siteName are optional so a site can exist before lodging
// and flights are booked.

const calendarDateSchema = z.string().refine(isValidCalendarDate, INVALID_CALENDAR_DATE_MESSAGE);

const tripSchema = z
  .object({
    siteName: z.string().min(1),
    tagline: z.string().min(1).optional(),
    startDate: calendarDateSchema.optional(),
    endDate: calendarDateSchema.optional(),
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

const httpsUrl = z
  .string()
  .url("Enter a complete HTTPS URL")
  .refine((value) => new URL(value).protocol === "https:", "URL must use HTTPS");

const lodgingSchema = z.object({
  name: z.string().min(1),
  url: httpsUrl.optional(),
  address: z.string().min(1).optional(),
  mapsUrl: httpsUrl.optional(),
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
  date: calendarDateSchema,
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
    .array(z.object({ label: z.string().min(1), url: httpsUrl.optional() }))
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

const rsvpConfigSchema = z.object({
  heading: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  plusOnePolicy: z.enum(["not-allowed", "allowed"]).optional(),
  allowPlusOne: z.boolean().optional(),
  maxPartySize: z.number().int().min(1).max(20).optional(),
});

export const partyContentSchema = z.object({
  kind: z.literal("trip").optional(),
  trip: tripSchema,
  rsvp: rsvpConfigSchema.optional(),
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

const legacyUrl = z
  .string()
  .url("Enter a complete HTTP or HTTPS URL")
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  }, "URL must use HTTP or HTTPS");

const legacyLodgingSchema = lodgingSchema.extend({
  url: legacyUrl.optional(),
  mapsUrl: legacyUrl.optional(),
});
const legacyActivitySchema = activitySchema.extend({
  options: z
    .array(z.object({ label: z.string().min(1), url: legacyUrl.optional() }))
    .optional(),
});

const legacyPartyContentSchema = partyContentSchema.extend({
  lodging: legacyLodgingSchema.optional(),
  activities: z
    .object({
      core: z.array(legacyActivitySchema).optional(),
      ifTimeAllows: z.array(legacyActivitySchema).optional(),
      backups: z.array(legacyActivitySchema).optional(),
    })
    .optional(),
});

function legacyHttpUrls(value: unknown): Map<string, string> {
  const urls = new Map<string, string>();
  const isHttpUrl = (candidate: unknown): candidate is string => {
    if (typeof candidate !== "string") return false;
    try {
      return new URL(candidate).protocol === "http:";
    } catch {
      return false;
    }
  };
  if (!value || typeof value !== "object") return urls;
  const content = value as Record<string, unknown>;
  const lodging = content.lodging;
  if (lodging && typeof lodging === "object") {
    const row = lodging as Record<string, unknown>;
    for (const key of ["url", "mapsUrl"]) {
      if (isHttpUrl(row[key])) {
        urls.set(`lodging.${key}`, row[key]);
      }
    }
  }
  const activities = content.activities;
  if (!activities || typeof activities !== "object") return urls;
  for (const section of ["core", "ifTimeAllows", "backups"]) {
    const items = (activities as Record<string, unknown>)[section];
    if (!Array.isArray(items)) continue;
    items.forEach((item, itemIndex) => {
      if (!item || typeof item !== "object") return;
      const options = (item as Record<string, unknown>).options;
      if (!Array.isArray(options)) return;
      options.forEach((option, optionIndex) => {
        if (!option || typeof option !== "object") return;
        const url = (option as Record<string, unknown>).url;
        if (isHttpUrl(url)) {
          urls.set(`activities.${section}.${itemIndex}.options.${optionIndex}.url`, url);
        }
      });
    });
  }
  return urls;
}

/** Validate new content strictly, while allowing unchanged HTTP URLs in legacy rows. */
export function parsePartyContentForExisting(value: unknown, previous: unknown) {
  const strict = partyContentSchema.safeParse(value);
  if (strict.success) return strict;
  const legacy = legacyPartyContentSchema.safeParse(value);
  if (!legacy.success) return strict;
  const before = legacyHttpUrls(previous);
  for (const [path, url] of legacyHttpUrls(value)) {
    if (before.get(path) !== url) return strict;
  }
  return legacy;
}

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
