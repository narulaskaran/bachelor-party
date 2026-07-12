import {
  pgTable,
  serial,
  text,
  jsonb,
  timestamp,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { PartyContent } from "@/lib/party-types";

// One row per bachelor party. The password doubles as the invite: whoever
// has it lands in this party's site. Passwords are plaintext by design
// (shared casual secrets, not credentials) but must be unique since login
// resolves the party by password alone.
export const parties = pgTable("parties", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  password: text("password").notNull().unique(),
  content: jsonb("content").$type<PartyContent>().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// One row per guest per party, upserted by normalized name.
export const guests = pgTable(
  "guests",
  {
    id: serial("id").primaryKey(),
    partyId: integer("party_id")
      .notNull()
      .references(() => parties.id),
    name: text("name").notNull(),
    nameKey: text("name_key").notNull(), // lowercased for upsert
    phone: text("phone"),
    arrivalFlight: text("arrival_flight"),
    arrivalTime: text("arrival_time"),
    departureFlight: text("departure_flight"),
    departureTime: text("departure_time"),
    dietary: text("dietary"),
    // { [activitySlug]: "hyped" | "fine" | "pass" }
    activityPrefs: jsonb("activity_prefs").$type<Record<string, string>>(),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("guests_party_name_idx").on(table.partyId, table.nameKey)]
);

export type Party = typeof parties.$inferSelect;
export type Guest = typeof guests.$inferSelect;
export type NewGuest = typeof guests.$inferInsert;
