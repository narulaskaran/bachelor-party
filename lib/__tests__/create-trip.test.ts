import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/admin/trips/route";
import {
  CREATE_TRIP_PATH,
  createTripFromUi,
  createTripRequestInit,
  formatDateLabel,
  parseOrganizerPacket,
  visitorSafeCreateError,
} from "@/lib/create-trip";
import { getDb } from "@/lib/db";
import { resetRateLimitStore } from "@/lib/rate-limit";
import { createMemoryDb } from "../../test/api/memory-db";

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return { ...actual, getDb: vi.fn() };
});

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const ENV_KEYS = ["ADMIN_UI_PASSWORD", "ADMIN_API_TOKEN", "DATABASE_URL"] as const;

describe("formatDateLabel", () => {
  it("omits a label when both dates are blank", () => {
    expect(formatDateLabel(undefined, "  ")).toBeUndefined();
  });

  it("formats a UTC range from date-picker values", () => {
    expect(formatDateLabel("2026-09-04", "2026-09-07")).toBe("Sep 4, 2026 – Sep 7, 2026");
  });
});

describe("create-from-UI helper", () => {
  afterEach(() => {
    resetRateLimitStore();
    vi.mocked(getDb).mockReset();
  });

  it("builds a public POST with siteName-only and no Authorization", () => {
    const init = createTripRequestInit({ siteName: "Jackson Hole '26" });
    expect(init.method).toBe("POST");
    const headers = new Headers(init.headers);
    expect(headers.get("authorization")).toBeNull();
    expect(headers.get("content-type")).toBe("application/json");
    expect(JSON.parse(String(init.body))).toMatchObject({
      slug: expect.stringMatching(/^e[0-9a-f]{16}$/),
      content: {
        kind: "trip",
        preset: "weekend",
        trip: { siteName: "Jackson Hole '26" },
        rsvp: { plusOnePolicy: "allowed" },
        presentation: { style: "clean" },
      },
    });
  });

  it("includes optional dates when provided", () => {
    const init = createTripRequestInit({
      siteName: "Cabin Weekend",
      startDate: "2026-09-04",
      endDate: "2026-09-07",
    });
    expect(JSON.parse(String(init.body))).toMatchObject({
      slug: expect.stringMatching(/^e[0-9a-f]{16}$/),
      content: {
        preset: "weekend",
        trip: {
          siteName: "Cabin Weekend",
          startDate: "2026-09-04",
          endDate: "2026-09-07",
          dateLabel: "Sep 4, 2026 – Sep 7, 2026",
        },
      },
    });
  });

  it("does not use a multi-fact dump as the event title", () => {
    const init = createTripRequestInit({
      siteName: "",
      plan: "Cabin weekend in Denver, Sep 4-6, pack layers",
      preset: "weekend",
    });
    expect(JSON.parse(String(init.body)).content.trip.siteName).toBe("Cabin weekend");
  });

  it("create-from-notes uses a human same-day dateLabel before host save", () => {
    const init = createTripRequestInit({
      siteName: "Cabin Weekend",
      plan: "2026-09-04 7:00 PM — group dinner",
    });
    const trip = JSON.parse(String(init.body)).content.trip;
    expect(trip).toMatchObject({
      startDate: "2026-09-04",
      dateLabel: "Sep 4, 2026",
    });
    expect(trip.dateLabel).not.toMatch(/2026-09-04/);
  });

  it("turns messy notes into the canonical draft payload while preserving structured overrides", () => {
    const init = createTripRequestInit({
      siteName: "Structured title",
      plan: "Event: Notes title\nLocation: Denver, CO\n2026-09-04 7:00 PM — dinner",
      startDate: "2026-10-10",
      endDate: "2026-10-12",
    });
    expect(JSON.parse(String(init.body))).toMatchObject({
      slug: expect.stringMatching(/^e[0-9a-f]{16}$/),
      content: {
        preset: "weekend",
        trip: {
          siteName: "Structured title",
          startDate: "2026-10-10",
          endDate: "2026-10-12",
          dateLabel: "Oct 10, 2026 – Oct 12, 2026",
          location: "Denver, CO",
        },
        draftReview: { acknowledged: false },
      },
    });
  });

  it("parses the 201 organizer packet fields the host needs", () => {
    expect(
      parseOrganizerPacket({
        url: "https://preview.example/jackson-hole-26",
        slug: "jackson-hole-26",
        password: "guest-pw",
        adminToken: "party-tok",
        trip: { id: 1, slug: "jackson-hole-26", adminToken: "party-tok" },
      }),
    ).toEqual({
      url: "https://preview.example/jackson-hole-26",
      slug: "jackson-hole-26",
      password: "guest-pw",
      adminToken: "party-tok",
    });
  });

  it("createTripFromUi POSTs to /api/admin/trips without a bearer token", async () => {
    const auths: (string | null)[] = [];
    const result = await createTripFromUi({ siteName: "Cabin Weekend" }, async (url, init) => {
      expect(url).toBe(CREATE_TRIP_PATH);
      auths.push(new Headers(init?.headers).get("authorization"));
      return jsonResponse(201, {
        url: "http://localhost/cabin-weekend",
        slug: "cabin-weekend",
        password: "guest-pw",
        adminToken: "party-tok",
      });
    });

    expect(auths[0]).toBeNull();
    expect(result).toEqual({
      ok: true,
      packet: {
        url: "http://localhost/cabin-weekend",
        slug: "cabin-weekend",
        password: "guest-pw",
        adminToken: "party-tok",
      },
    });
  });

  it("rejects a blank name before calling the API", async () => {
    const fetchImpl = vi.fn();
    const result = await createTripFromUi({ siteName: " " }, fetchImpl);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, error: "Paste your notes." });
  });

  it("rejects an inverted date range before calling the API", async () => {
    const fetchImpl = vi.fn();
    const result = await createTripFromUi(
      { siteName: "Cabin Weekend", startDate: "2026-12-20", endDate: "2026-12-10" },
      fetchImpl,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/before start date/i);
  });

  it("maps rate-limit, reserved-slug, and outages without env-var names", () => {
    for (const status of [429, 503]) {
      const message = visitorSafeCreateError(status, {
        error: "Set ADMIN_UI_PASSWORD and DATABASE_URL",
      });
      expect(message).not.toMatch(/ADMIN_UI_PASSWORD|ADMIN_API_TOKEN|DATABASE_URL/);
      for (const key of ENV_KEYS) expect(message).not.toContain(key);
    }
    expect(visitorSafeCreateError(429, {})).toMatch(/few minutes/i);
    expect(visitorSafeCreateError(503, { error: "Database not configured" })).toMatch(
      /try again/i,
    );
    expect(
      visitorSafeCreateError(400, {
        error: "Invalid trip payload",
        issues: [
          {
            path: "slug",
            message: "slug is reserved",
            hint: "These slugs collide with app routes: admin, api.",
          },
        ],
      }),
    ).toMatch(/collide with app routes/i);
  });

  it("strips env-var names from API errors", () => {
    const leaked = visitorSafeCreateError(500, {
      error: "Set ADMIN_API_TOKEN in the environment",
    });
    expect(leaked).toBe("Couldn't create that trip.");
    expect(leaked).not.toContain("ADMIN_API_TOKEN");
  });

  it("create-from-UI path: helper → public POST handler → packet (no deploy secret)", async () => {
    const mem = createMemoryDb();
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const result = await createTripFromUi(
      { siteName: "Jackson Hole '26" },
      async (_url, init) => {
        return POST(
          new Request("http://localhost/api/admin/trips", {
            method: init?.method ?? "POST",
            headers: init?.headers,
            body: init?.body as BodyInit,
          }),
        );
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.packet.slug).toMatch(/^e[0-9a-f]{16}$/);
    expect(result.packet.url).toBe(`http://localhost/${result.packet.slug}/host`);
    expect(result.packet.password.length).toBeGreaterThanOrEqual(8);
    expect(result.packet.adminToken.length).toBeGreaterThanOrEqual(16);
    expect(mem.parties).toHaveLength(1);
  });
});
