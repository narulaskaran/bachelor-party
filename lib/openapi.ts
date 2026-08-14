import { z } from "zod";
import {
  createPartySchema,
  partyContentSchema,
  updatePartySchema,
} from "@/lib/party-schema";

function jsonSchema(schema: z.ZodType) {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  return json;
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
    slug: { type: "string" },
    password: { type: "string" },
    adminToken: { type: "string", nullable: true },
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
    summary: "JSON Merge Patch content and/or replace password",
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
      version: "0.2.0",
      description:
        "Headless group-trip HQ. Canonical paths are `/api/admin/trips`. `/api/admin/parties/**` is the same handlers (alias). Create with the global ADMIN_API_TOKEN; slug routes also accept the trip's adminToken. JSON keys `trip` and `party` (and `trips`/`parties`) are both returned.",
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
          summary: "List trips (no passwords or full content)",
          security: bearer,
          responses: {
            "200": {
              description: "Index",
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
          summary: "Create a trip — siteName is enough",
          security: bearer,
          requestBody: {
            required: true,
            ...json({ $ref: "#/components/schemas/CreateTrip" }),
          },
          responses: {
            "201": {
              description: "Organizer packet",
              ...json({ $ref: "#/components/schemas/OrganizerPacket" }),
            },
            "400": { description: "Invalid payload", ...json({ $ref: "#/components/schemas/Error" }) },
            "409": { description: "Slug or password taken", ...json({ $ref: "#/components/schemas/Error" }) },
          },
        },
      },
      "/api/admin/trips/{slug}": tripItemPath,
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
          description: "ADMIN_API_TOKEN, or the trip's adminToken on /{slug} routes",
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
        CreateTrip: jsonSchema(createPartySchema),
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
      },
    },
  };
}
