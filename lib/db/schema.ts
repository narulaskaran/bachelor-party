import {
  pgTable,
  serial,
  text,
  jsonb,
  boolean,
  timestamp,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { PartyContent } from "@/lib/party-types";
import type { RsvpAttendance } from "@/lib/rsvp-contract";

// One row per trip. The password doubles as the invite: whoever
// has it lands in this trip's site. Passwords are plaintext by design
// (shared casual secrets, not credentials) but must be unique since login
// resolves the party by password alone.
export const parties = pgTable("parties", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  password: text("password").notNull().unique(),
  adminToken: text("admin_token").unique(), // optional per-party admin API token
  /** Unguessable guest invite token. Null on legacy password-gated rows. */
  guestToken: text("guest_token").unique(),
  content: jsonb("content").$type<PartyContent>().notNull(),
  draftContent: jsonb("draft_content").$type<PartyContent>(),
  published: boolean("published").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// One row per guest identity per party. Identity is guestToken (cookie),
// not display name — duplicate names are allowed.
export const guests = pgTable(
  "guests",
  {
    id: serial("id").primaryKey(),
    partyId: integer("party_id")
      .notNull()
      .references(() => parties.id),
    guestToken: text("guest_token").notNull(),
    name: text("name").notNull(),
    nameKey: text("name_key").notNull(), // lowercased display name; not unique
    attendanceStatus: text("attendance_status").$type<RsvpAttendance>().notNull().default("attending"),
    partySize: integer("party_size").notNull().default(1),
    plusOneName: text("plus_one_name"),
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
  (table) => [
    uniqueIndex("guests_party_guest_token_idx").on(table.partyId, table.guestToken),
  ]
);

// Immutable audit trail for trip content. One append-only row per draft save
// or publish, storing a FULL content snapshot (not a diff). Rows are never
// updated or deleted by application code, and the 0006 migration installs a
// trigger that rejects UPDATE/DELETE at the database level so published
// history survives forever.
export type ContentVersionState = "draft" | "published";
export type ContentVersionActorType = "host" | "admin" | "agent";
export const contentVersions = pgTable(
  "content_versions",
  {
    id: serial("id").primaryKey(),
    partyId: integer("party_id")
      .notNull()
      .references(() => parties.id),
    /** Per-party monotonic sequence: 1, 2, 3, ... in insert order. */
    version: integer("version").notNull(),
    state: text("state").$type<ContentVersionState>().notNull(),
    contentSnapshot: jsonb("content_snapshot").$type<PartyContent>().notNull(),
    /** Version this snapshot was derived from (the prior head), when known. */
    baseVersion: integer("base_version"),
    actorType: text("actor_type").$type<ContentVersionActorType>().notNull(),
    /**
     * Credential identifier for the actor — e.g. a short hash prefix of the
     * admin token. NEVER the raw secret itself.
     */
    actorId: text("actor_id"),
    changeSummary: text("change_summary"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    /** Set only on 'published' rows. */
    publishedAt: timestamp("published_at"),
  },
  (table) => [
    uniqueIndex("content_versions_party_version_idx").on(table.partyId, table.version),
  ]
);

export type Party = typeof parties.$inferSelect;
export type Guest = typeof guests.$inferSelect;
export type NewGuest = typeof guests.$inferInsert;
export type ContentVersion = typeof contentVersions.$inferSelect;
export type NewContentVersion = typeof contentVersions.$inferInsert;
