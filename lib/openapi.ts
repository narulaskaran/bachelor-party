import { z } from "zod";
import {
  createPartySchema,
  partyContentSchema,
  updatePartySchema,
} from "@/lib/party-schema";
import { RESERVED_SLUGS } from "@/lib/slug";

function jsonSchema(schema: z.ZodType) {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

function createTripJsonSchema() {
  const schema = jsonSchema(createPartySchema) as {
    properties?: { slug?: Record<string, unknown> };
  };
  const slug = schema.properties?.slug;
  if (slug) {
    slug.description = `Lowercase kebab-case. Cannot be a reserved app route: ${RESERVED_SLUGS.join(", ")}.`;
    slug.not = { enum: [...RESERVED_SLUGS] };
  }
  return schema;
}

const errorSchema = {
  type: "object",
  properties: {
    error: { type: "string" },
    issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          path: { type: "string" },
          message: { type: "string" },
          hint: { type: "string" },
        },
        required: ["path", "message"],
      },
    },
  },
  required: ["error"],
};

const organizerPacketSchema = {
  type: "object",
  properties: {
    url: { type: "string" },
    hostUrl: { type: "string", description: "Relative host editor path, /{slug}/host" },
    guestUrl: {
      type: ["string", "null"],
      description: "Guest invite path /g/{token}. Null until an explicit host publish.",
    },
    slug: { type: "string" },
    password: { type: "string" },
    adminToken: { type: "string", nullable: true },
    published: { type: "boolean" },
    content: { $ref: "#/components/schemas/PartyContent" },
    draftReview: { type: "object", nullable: true },
    trip: {
      type: "object",
      properties: {
        id: { type: "integer" },
        slug: { type: "string" },
        adminToken: { type: "string", nullable: true },
      },
    },
    party: {
      type: "object",
      description: "Alias of `trip` for older /parties clients.",
      properties: {
        id: { type: "integer" },
        slug: { type: "string" },
        adminToken: { type: "string", nullable: true },
      },
    },
  },
  required: ["url", "slug", "password", "adminToken"],
};

const json = (schema: unknown) => ({
  content: { "application/json": { schema } },
});

const bearer = [{ bearerAuth: [] }];

const tripItemPath = {
  get: {
    operationId: "getTrip",
    tags: ["trips"],
    summary: "Full trip record, including password and content",
    security: bearer,
    parameters: [{ $ref: "#/components/parameters/slug" }],
    responses: {
      "200": { description: "Trip", ...json({ $ref: "#/components/schemas/TripRecord" }) },
      "401": { description: "Unauthorized", ...json({ $ref: "#/components/schemas/Error" }) },
      "404": { description: "Not found", ...json({ $ref: "#/components/schemas/Error" }) },
    },
  },
  patch: {
    operationId: "patchTrip",
    tags: ["trips"],
    summary: "JSON Merge Patch the working DRAFT and/or replace password. Does not publish.",
    security: bearer,
    parameters: [{ $ref: "#/components/parameters/slug" }],
    requestBody: {
      required: true,
      ...json({ $ref: "#/components/schemas/UpdateTrip" }),
    },
    responses: {
      "200": { description: "Updated trip", ...json({ $ref: "#/components/schemas/TripRecord" }) },
      "400": { description: "Invalid merge", ...json({ $ref: "#/components/schemas/Error" }) },
      "401": { description: "Unauthorized", ...json({ $ref: "#/components/schemas/Error" }) },
      "409": { description: "Password collision", ...json({ $ref: "#/components/schemas/Error" }) },
    },
  },
  delete: {
    operationId: "deleteTrip",
    tags: ["trips"],
    summary: "Delete the trip and its guest RSVPs",
    security: bearer,
    parameters: [{ $ref: "#/components/parameters/slug" }],
    responses: {
      "200": {
        description: "Deleted",
        ...json({
          type: "object",
          properties: { deleted: { type: "string" } },
          required: ["deleted"],
        }),
      },
      "401": { description: "Unauthorized", ...json({ $ref: "#/components/schemas/Error" }) },
    },
  },
};

export function openApiSpec() {
  return {
    openapi: "3.1.0",
    info: {
      title: "The Big Send admin API",
      version: "0.4.0",
      description:
        "Headless group-trip HQ. Canonical paths are `/api/admin/trips`. `/api/admin/parties/**` rewrites to the same handlers. Create needs no Authorization; the 201 organizer packet's adminToken is the only credential for that trip. JSON keys `trip` and `party` (and `trips`/`parties`) are both returned. Trip slugs cannot be reserved app routes: " +
        RESERVED_SLUGS.join(", ") +
        ". HARD RULE: agents cannot silently publish. POST create and PATCH edit the working draft only (`published: false`). Guests keep the last published snapshot until an explicit host action: the site Publish button, or POST `/api/admin/trips/{slug}/publish` with the host session cookie or host key (adminToken). Create never returns a guest URL.",
    },
    servers: [{ url: "/", description: "This deployment" }],
    tags: [
      { name: "trips", description: "Create and edit trips" },
      { name: "guests", description: "RSVP roster" },
    ],
    paths: {
      "/api/admin/trips": {
        get: {
          operationId: "listTrips",
          tags: ["trips"],
          summary: "The trip for the presented adminToken (never other people's trips)",
          security: bearer,
          responses: {
            "200": {
              description: "Index of at most that one trip",
              ...json({
                type: "object",
                properties: {
                  trips: { type: "array", items: { $ref: "#/components/schemas/TripIndexItem" } },
                  parties: {
                    type: "array",
                    items: { $ref: "#/components/schemas/TripIndexItem" },
                    description: "Alias of `trips`.",
                  },
                },
              }),
            },
            "401": { description: "Unauthorized", ...json({ $ref: "#/components/schemas/Error" }) },
          },
        },
        post: {
          operationId: "createTrip",
          tags: ["trips"],
          summary: "Create an unpublished draft — plan dump or siteName; no Authorization required",
          security: [],
          requestBody: {
            required: true,
            ...json({ $ref: "#/components/schemas/CreateTrip" }),
          },
          responses: {
            "201": {
              description: "Organizer packet",
              ...json({ $ref: "#/components/schemas/OrganizerPacket" }),
            },
            "400": {
              description: "Invalid payload (including reserved slugs)",
              ...json({ $ref: "#/components/schemas/Error" }),
            },
            "409": { description: "Slug or password taken", ...json({ $ref: "#/components/schemas/Error" }) },
            "429": { description: "Rate limited (per IP)", ...json({ $ref: "#/components/schemas/Error" }) },
          },
        },
      },
      "/api/admin/trips/{slug}": tripItemPath,
      "/api/admin/trips/{slug}/publish": {
        post: {
          operationId: "publishTrip",
          tags: ["trips"],
          summary: "Publish the working draft (host-only; never implied by create or PATCH)",
          description:
            "Copies the working draft to the guest snapshot and returns guestUrl `/g/{token}`. Auth is the trip adminToken (host key) as Bearer, or the host session cookie. Agents must not treat create or PATCH as publish.",
          security: bearer,
          parameters: [{ $ref: "#/components/parameters/slug" }],
          responses: {
            "200": {
              description: "Published; guestUrl is now `/g/{token}`",
              ...json({ $ref: "#/components/schemas/OrganizerPacket" }),
            },
            "401": { description: "Unauthorized", ...json({ $ref: "#/components/schemas/Error" }) },
            "409": {
              description: "Draft review incomplete",
              ...json({ $ref: "#/components/schemas/Error" }),
            },
          },
        },
      },
      "/api/admin/trips/{slug}/versions": {
        get: {
          operationId: "listTripVersions",
          tags: ["trips"],
          summary:
            "Immutable content_versions audit trail (full snapshots), newest first",
          description:
            "Append-only history of every draft save and publish. Rows are never updated or deleted (enforced by database triggers too). actorId is a one-way credential fingerprint, never a raw token.",
          security: bearer,
          parameters: [
            { $ref: "#/components/parameters/slug" },
            {
              name: "limit",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 1, maximum: 500, default: 100 },
            },
          ],
          responses: {
            "200": {
              description: "Versions for this trip, newest first",
              ...json({
                type: "object",
                properties: {
                  trip: {
                    type: "object",
                    properties: { slug: { type: "string" } },
                  },
                  party: {
                    type: "object",
                    properties: { slug: { type: "string" } },
                    description: "Alias of `trip`.",
                  },
                  versions: {
                    type: "array",
                    items: { $ref: "#/components/schemas/ContentVersion" },
                  },
                },
                required: ["versions"],
              }),
            },
            "401": { description: "Unauthorized", ...json({ $ref: "#/components/schemas/Error" }) },
          },
        },
      },
      "/api/admin/trips/{slug}/guests": {
        get: {
          operationId: "listGuests",
          tags: ["guests"],
          summary: "List RSVPs for a trip",
          security: bearer,
          parameters: [{ $ref: "#/components/parameters/slug" }],
          responses: {
            "200": {
              description: "Guests",
              ...json({
                type: "object",
                properties: { guests: { type: "array", items: { $ref: "#/components/schemas/Guest" } } },
                required: ["guests"],
              }),
            },
            "401": { description: "Unauthorized", ...json({ $ref: "#/components/schemas/Error" }) },
          },
        },
      },
      "/api/admin/trips/{slug}/guests/export": {
        get: {
          operationId: "exportGuestRosterCsv",
          tags: ["guests"],
          summary: "Download the full-detail guest roster as CSV",
          description:
            "Organizer-only CSV (name, phone, flights, dietary, activity votes, notes). " +
            "Requires the trip's admin bearer token; guest passwords and guest tokens are rejected.",
          security: bearer,
          parameters: [{ $ref: "#/components/parameters/slug" }],
          responses: {
            "200": {
              description: "CSV attachment",
              content: {
                "text/csv": { schema: { type: "string" } },
              },
            },
            "401": { description: "Unauthorized", ...json({ $ref: "#/components/schemas/Error" }) },
          },
        },
      },
      "/api/admin/trips/{slug}/guests/{id}": {
        delete: {
          operationId: "deleteGuest",
          tags: ["guests"],
          summary: "Remove one guest RSVP",
          security: bearer,
          parameters: [
            { $ref: "#/components/parameters/slug" },
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: {
            "200": {
              description: "Deleted",
              ...json({
                type: "object",
                properties: { deleted: { type: "integer" } },
                required: ["deleted"],
              }),
            },
            "401": { description: "Unauthorized", ...json({ $ref: "#/components/schemas/Error" }) },
            "404": { description: "Not found", ...json({ $ref: "#/components/schemas/Error" }) },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "The trip's adminToken from the 201 organizer packet",
        },
      },
      parameters: {
        slug: {
          name: "slug",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      },
      schemas: {
        CreateTrip: createTripJsonSchema(),
        UpdateTrip: jsonSchema(updatePartySchema),
        PartyContent: jsonSchema(partyContentSchema),
        Error: errorSchema,
        OrganizerPacket: organizerPacketSchema,
        TripIndexItem: {
          type: "object",
          properties: {
            id: { type: "integer" },
            slug: { type: "string" },
            siteName: { type: "string" },
            dateLabel: { type: "string" },
            guestCount: { type: "integer" },
            createdAt: { type: "string" },
            updatedAt: { type: "string" },
          },
        },
        TripRecord: {
          type: "object",
          properties: {
            trip: { $ref: "#/components/schemas/PartyRow" },
            party: { $ref: "#/components/schemas/PartyRow" },
          },
        },
        PartyRow: {
          type: "object",
          properties: {
            id: { type: "integer" },
            slug: { type: "string" },
            password: { type: "string" },
            adminToken: { type: "string", nullable: true },
            content: { $ref: "#/components/schemas/PartyContent" },
            published: { type: "boolean" },
            hostUrl: { type: "string" },
            guestUrl: { type: ["string", "null"] },
            createdAt: { type: "string" },
            updatedAt: { type: "string" },
          },
        },
        Guest: {
          type: "object",
          properties: {
            id: { type: "integer" },
            partyId: { type: "integer" },
            name: { type: "string" },
            nameKey: { type: "string" },
            phone: { type: "string", nullable: true },
            arrivalFlight: { type: "string", nullable: true },
            arrivalTime: { type: "string", nullable: true },
            departureFlight: { type: "string", nullable: true },
            departureTime: { type: "string", nullable: true },
            dietary: { type: "string", nullable: true },
            activityPrefs: { type: "object", additionalProperties: { type: "string" } },
            notes: { type: "string", nullable: true },
          },
        },
        ContentVersion: {
          type: "object",
          properties: {
            id: { type: "integer" },
            version: { type: "integer", description: "Per-party monotonic sequence" },
            state: { type: "string", enum: ["draft", "published"] },
            contentSnapshot: {
              allOf: [{ $ref: "#/components/schemas/PartyContent" }],
              description: "FULL snapshot, not a diff",
            },
            baseVersion: { type: "integer", nullable: true },
            actorType: { type: "string", enum: ["host", "admin", "agent"] },
            actorId: {
              type: "string",
              nullable: true,
              description: "One-way credential fingerprint (sha256:<12 hex>), never a raw token",
            },
            changeSummary: { type: "string", nullable: true },
            createdAt: { type: "string" },
            publishedAt: { type: "string", nullable: true },
          },
          required: ["id", "version", "state", "contentSnapshot", "actorType", "createdAt"],
        },
      },
    },
  };
}
