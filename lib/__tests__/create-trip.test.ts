import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/admin/trips/route";
import {
  CREATE_TRIP_PATH,
  createTripFromUi,
  createTripRequestInit,
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

describe("create-from-UI helper", () => {
  afterEach(() => {
    resetRateLimitStore();
    vi.mocked(getDb).mockReset();
  });

  it("builds a public POST with siteName-only and no Authorization", () => {
    const init = createTripRequestInit("Jackson Hole '26");
    expect(init.method).toBe("POST");
    const headers = new Headers(init.headers);
    expect(headers.get("authorization")).toBeNull();
    expect(headers.get("content-type")).toBe("application/json");
    expect(JSON.parse(String(init.body))).toEqual({
      content: { trip: { siteName: "Jackson Hole '26" } },
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
    const result = await createTripFromUi("Cabin Weekend", async (url, init) => {
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
    const result = await createTripFromUi("   ", fetchImpl);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, error: "Give the trip a name." });
  });

  it("maps rate-limit and outages to visitor copy without env-var names", () => {
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
  });

  it("surfaces a validation hint and strips env-var names from API errors", () => {
    expect(
      visitorSafeCreateError(400, {
        error: "Invalid trip payload",
        issues: [{ path: "content.trip.siteName", message: "too small", hint: "The trip needs a name." }],
      }),
    ).toBe("The trip needs a name.");

    const leaked = visitorSafeCreateError(500, {
      error: "Set ADMIN_API_TOKEN in the environment",
    });
    expect(leaked).toBe("Couldn't create that trip.");
    expect(leaked).not.toContain("ADMIN_API_TOKEN");
  });

  it("create-from-UI path: helper → public POST handler → packet (no deploy secret)", async () => {
    const mem = createMemoryDb();
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const result = await createTripFromUi("Jackson Hole '26", async (_url, init) => {
      return POST(
        new Request("http://localhost/api/admin/trips", {
          method: init?.method ?? "POST",
          headers: init?.headers,
          body: init?.body,
        }),
      );
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.packet.slug).toBe("jackson-hole-26");
    expect(result.packet.url).toBe("http://localhost/jackson-hole-26");
    expect(result.packet.password.length).toBeGreaterThanOrEqual(8);
    expect(result.packet.adminToken.length).toBeGreaterThanOrEqual(16);
    expect(mem.parties).toHaveLength(1);
  });

  it("does not mint a trip whose slug would hide /create", async () => {
    const mem = createMemoryDb();
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const result = await createTripFromUi("Create", async (_url, init) => {
      return POST(
        new Request("http://localhost/api/admin/trips", {
          method: init?.method ?? "POST",
          headers: init?.headers,
          body: init?.body,
        }),
      );
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.packet.slug).not.toBe("create");
    expect(result.packet.slug).toBe("create-2");
  });

  it("explicit reserved slug create is 409, not a colliding trip", async () => {
    const mem = createMemoryDb();
    vi.mocked(getDb).mockReturnValue(mem.db as never);

    const res = await POST(
      new Request("http://localhost/api/admin/trips", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug: "create",
          content: { trip: { siteName: "Should not land on /create" } },
        }),
      }),
    );
    expect(res.status).toBe(409);
    expect(mem.parties).toHaveLength(0);
  });
});
