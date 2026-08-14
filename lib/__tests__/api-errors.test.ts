import { describe, it, expect } from "vitest";
import { z } from "zod";
import { issuesFromZod } from "@/lib/api-errors";
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
