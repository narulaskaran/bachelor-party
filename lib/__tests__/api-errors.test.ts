import { describe, it, expect } from "vitest";
import { z } from "zod";
import { issuesFromZod, readJsonBody } from "@/lib/api-errors";
import { partyContentSchema } from "@/lib/party-schema";

describe("issuesFromZod", () => {
  it("adds a siteName hint", () => {
    const parsed = partyContentSchema.safeParse({ trip: {} });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const issues = issuesFromZod(parsed.error);
    const siteName = issues.find((i) => i.path === "trip.siteName");
    expect(siteName?.hint).toMatch(/name/i);
  });

  it("hints that kind event is not supported", () => {
    const parsed = partyContentSchema.safeParse({ kind: "event", trip: { siteName: "X" } });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const issues = issuesFromZod(parsed.error);
    expect(issues.some((i) => i.path === "kind" && i.hint?.includes("trip"))).toBe(true);
  });

  it("uses (root) when the path is empty", () => {
    const parsed = z.string().safeParse(1);
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(issuesFromZod(parsed.error)[0].path).toBe("(root)");
  });
});

describe("readJsonBody", () => {
  it("returns 400 with issues for malformed JSON", async () => {
    const res = await readJsonBody(
      new Request("http://localhost/api/admin/trips", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not json",
      }),
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.response.status).toBe(400);
    expect(await res.response.json()).toMatchObject({
      error: "Invalid JSON",
      issues: [{ path: "(root)" }],
    });
  });
});
