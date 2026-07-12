import {
  pgTable,
  serial,
  text,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

// One row per guest, upserted by normalized name.
export const guests = pgTable("guests", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameKey: text("name_key").notNull().unique(), // lowercased for upsert
  phone: text("phone"),
  arrivalFlight: text("arrival_flight"), // e.g. "UA 1523"
  arrivalTime: text("arrival_time"), // e.g. "Fri Sep 4, 10:45 AM"
  departureFlight: text("departure_flight"),
  departureTime: text("departure_time"),
  dietary: text("dietary"),
  // { [activitySlug]: "hyped" | "fine" | "pass" }
  activityPrefs: jsonb("activity_prefs").$type<Record<string, string>>(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Guest = typeof guests.$inferSelect;
export type NewGuest = typeof guests.$inferInsert;
