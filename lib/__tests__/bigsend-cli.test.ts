import { describe, it, expect } from "vitest";
import { runBigsend, type RunIO } from "@/lib/bigsend-cli";

type Call = { method: string; url: string; body: unknown };

function ioHarness(opts: {
  fetchImpl: (url: string, init?: RequestInit) => Promise<Response>;
  files?: Record<string, string>;
  env?: Record<string, string>;
}) {
  const files = { ...(opts.files ?? {}) };
  const stdout: string[] = [];
  const stderr: string[] = [];
  const io: RunIO = {
    env: {
      BIGSEND_API_URL: "https://preview.example",
      BIGSEND_CONFIG: "/tmp/bigsend-test.json",
      ...opts.env,
    },
    fetch: opts.fetchImpl as typeof fetch,
    stdout: { write: (c) => void stdout.push(c) },
    stderr: { write: (c) => void stderr.push(c) },
    readFile: (path) => {
      if (!(path in files)) throw new Error(`ENOENT ${path}`);
      return files[path];
    },
    writeFile: (path, data) => {
      files[path] = data;
    },
  };
  return { io, stdout, stderr, files };
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("bigsend CLI", () => {
  it("create --name POSTs siteName-only to /api/admin/trips without Authorization and stores the token", async () => {
    const calls: Call[] = [];
    const auths: (string | null)[] = [];
    const { io, stdout, files } = ioHarness({
      fetchImpl: async (url, init) => {
        const body = init?.body ? JSON.parse(String(init.body)) : undefined;
        calls.push({ method: init?.method ?? "GET", url, body });
        auths.push(new Headers(init?.headers).get("authorization"));
        return jsonResponse(201, {
          url: "https://preview.example/e2e-smoke",
          slug: "e2e-smoke",
          password: "guest-pw",
          adminToken: "party-tok",
        });
      },
    });

    const code = await runBigsend(["create", "--name", "E2E Smoke"], io);
    expect(code).toBe(0);
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe("POST");
    expect(calls[0].url).toBe("https://preview.example/api/admin/trips");
    expect(calls[0].body).toEqual({ content: { trip: { siteName: "E2E Smoke" } } });
    expect(auths[0]).toBeNull();
    expect(JSON.parse(stdout.join(""))).toEqual({
      url: "https://preview.example/e2e-smoke",
      slug: "e2e-smoke",
      password: "guest-pw",
      adminToken: "party-tok",
    });
    expect(JSON.parse(files["/tmp/bigsend-test.json"]).tokens["e2e-smoke"]).toBe("party-tok");
  });

  it("create --plan POSTs a dump payload and never implies publish", async () => {
    const calls: Call[] = [];
    const { io, stdout } = ioHarness({
      fetchImpl: async (url, init) => {
        const body = init?.body ? JSON.parse(String(init.body)) : undefined;
        calls.push({ method: init?.method ?? "GET", url, body });
        return jsonResponse(201, {
          url: "https://preview.example/cabin-weekend/host",
          hostUrl: "/cabin-weekend/host",
          guestUrl: null,
          slug: "cabin-weekend",
          password: "guest-pw",
          adminToken: "party-tok",
          published: false,
        });
      },
    });

    const code = await runBigsend(
      ["create", "--plan", "Cabin weekend in Denver", "--preset", "weekend"],
      io,
    );
    expect(code).toBe(0);
    expect(calls[0].body).toEqual({
      plan: "Cabin weekend in Denver",
      preset: "weekend",
    });
    expect(JSON.parse(stdout.join(""))).toMatchObject({
      slug: "cabin-weekend",
      guestUrl: null,
      published: false,
      hostUrl: "/cabin-weekend/host",
    });
  });

  it("create --plan accepts the celebration preset", async () => {
    const calls: Call[] = [];
    const { io } = ioHarness({
      fetchImpl: async (url, init) => {
        calls.push({ method: init?.method ?? "GET", url, body: JSON.parse(String(init?.body)) });
        return jsonResponse(201, { slug: "birthday", password: "guest-pw", adminToken: "party-tok" });
      },
    });
    expect(await runBigsend(["create", "--plan", "Birthday dinner", "--preset", "celebration"], io)).toBe(0);
    expect(calls[0].body).toEqual({ plan: "Birthday dinner", preset: "celebration" });
  });

  it("schedule add GETs then PATCHes with the stored slug token, not a leftover env token", async () => {
    const auths: string[] = [];
    const calls: Call[] = [];
    const { io } = ioHarness({
      env: { BIGSEND_TOKEN: "leftover-env-token" },
      files: {
        "/tmp/bigsend-test.json": JSON.stringify({ tokens: { cabin: "slug-tok" } }),
      },
      fetchImpl: async (url, init) => {
        auths.push(String(new Headers(init?.headers).get("authorization")));
        const body = init?.body ? JSON.parse(String(init.body)) : undefined;
        calls.push({ method: init?.method ?? "GET", url, body });
        if (init?.method === "GET") {
          return jsonResponse(200, {
            trip: { slug: "cabin", content: { trip: { siteName: "Cabin" } } },
          });
        }
        return jsonResponse(200, {
          trip: {
            slug: "cabin",
            content: { trip: { siteName: "Cabin" }, schedule: body.content.schedule },
          },
        });
      },
    });

    const code = await runBigsend(
      ["schedule", "add", "cabin", "--day", "2026-09-05", "--title", "Dinner", "--time", "7:00 PM"],
      io,
    );
    expect(code).toBe(0);
    expect(calls.map((c) => c.method)).toEqual(["GET", "PATCH"]);
    expect(calls[1].url).toBe("https://preview.example/api/admin/trips/cabin");
    expect(calls[1].body).toEqual({
      content: {
        schedule: [
          {
            key: "2026-09-05",
            date: "2026-09-05",
            weekday: "Saturday",
            label: "Saturday",
            timed: true,
            entries: [{ title: "Dinner", time: "7:00 PM" }],
          },
        ],
      },
    });
    expect(auths.every((a) => a === "Bearer slug-tok")).toBe(true);
  });

  it("schedule add keys days by ISO date so two Saturdays stay separate", async () => {
    const calls: Call[] = [];
    const { io } = ioHarness({
      env: { BIGSEND_TOKEN: "packet-tok" },
      fetchImpl: async (url, init) => {
        const body = init?.body ? JSON.parse(String(init.body)) : undefined;
        calls.push({ method: init?.method ?? "GET", url, body });
        if (init?.method === "GET") {
          return jsonResponse(200, {
            trip: {
              slug: "cabin",
              content: {
                trip: { siteName: "Cabin" },
                schedule: [
                  {
                    key: "2026-09-05",
                    date: "2026-09-05",
                    weekday: "Saturday",
                    label: "Saturday",
                    timed: true,
                    entries: [{ title: "Dinner" }],
                  },
                ],
              },
            },
          });
        }
        return jsonResponse(200, { trip: { slug: "cabin", content: { schedule: body.content.schedule } } });
      },
    });

    const code = await runBigsend(
      ["schedule", "add", "cabin", "--day", "2026-09-12", "--title", "Second Saturday"],
      io,
    );
    expect(code).toBe(0);
    const schedule = calls[1].body as { content: { schedule: { key: string; date: string }[] } };
    expect(schedule.content.schedule.map((d) => d.key)).toEqual(["2026-09-05", "2026-09-12"]);
  });

  it("schedule add --key-event marks the entry as a key event", async () => {
    const calls: Call[] = [];
    const { io } = ioHarness({
      env: { BIGSEND_TOKEN: "packet-tok" },
      fetchImpl: async (_url, init) => {
        const body = init?.body ? JSON.parse(String(init.body)) : undefined;
        calls.push({ method: init?.method ?? "GET", url: String(_url), body });
        if (init?.method === "GET") {
          return jsonResponse(200, {
            trip: { slug: "cabin", content: { trip: { siteName: "Cabin" } } },
          });
        }
        return jsonResponse(200, { trip: { slug: "cabin", content: body.content } });
      },
    });

    const code = await runBigsend(
      [
        "schedule",
        "add",
        "cabin",
        "--day",
        "2026-09-05",
        "--title",
        "Dinner",
        "--key-event",
      ],
      io,
    );
    expect(code).toBe(0);
    expect(calls[1].body).toMatchObject({
      content: {
        schedule: [{ entries: [{ title: "Dinner", marquee: true }] }],
      },
    });
  });

  it("get / guests / lodging / delete map to the trips API", async () => {
    const calls: Call[] = [];
    const { io } = ioHarness({
      env: { BIGSEND_TOKEN: "packet-tok" },
      fetchImpl: async (url, init) => {
        calls.push({
          method: init?.method ?? "GET",
          url,
          body: init?.body ? JSON.parse(String(init.body)) : undefined,
        });
        return jsonResponse(200, { trip: { slug: "cabin" }, guests: [], deleted: "cabin" });
      },
    });

    expect(await runBigsend(["get", "cabin"], io)).toBe(0);
    expect(await runBigsend(["guests", "cabin"], io)).toBe(0);
    expect(await runBigsend(["lodging", "cabin", "--name", "Pinewood Lodge"], io)).toBe(0);
    expect(await runBigsend(["delete", "cabin"], io)).toBe(1);
    expect(await runBigsend(["delete", "cabin", "--yes"], io)).toBe(0);

    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      "GET https://preview.example/api/admin/trips/cabin",
      "GET https://preview.example/api/admin/trips/cabin/guests",
      "PATCH https://preview.example/api/admin/trips/cabin",
      "DELETE https://preview.example/api/admin/trips/cabin",
    ]);
    expect(calls[2].body).toEqual({ content: { lodging: { name: "Pinewood Lodge" } } });
  });

  it("prints API errors on stderr and exits 1", async () => {
    const { io, stderr } = ioHarness({
      fetchImpl: async () =>
        jsonResponse(409, {
          error: "Trip with slug 'x' already exists",
          issues: [{ path: "slug", message: "already exists" }],
        }),
    });
    const code = await runBigsend(["create", "--name", "X", "--slug", "x"], io);
    expect(code).toBe(1);
    expect(stderr.join("")).toContain("already exists");
  });

  it("does not call fetch without BIGSEND_API_URL", async () => {
    let called = false;
    const { io } = ioHarness({
      env: { BIGSEND_API_URL: "" },
      fetchImpl: async () => {
        called = true;
        return jsonResponse(200, {});
      },
    });
    io.env.BIGSEND_API_URL = undefined;
    expect(await runBigsend(["get", "x"], io)).toBe(1);
    expect(called).toBe(false);
  });
});
