import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { tryToParsePath } from "next/dist/lib/try-to-parse-path";
import nextConfig from "@/next.config";
import { config as proxyConfig, GUEST_PATH_MATCHER, proxy } from "@/proxy";

const LLMS_TXT = readFileSync(new URL("../public/llms.txt", import.meta.url), "utf8");

function proxyMatcherHits(pathname: string): boolean {
  return proxyConfig.matcher.some((source) => {
    const { regexStr, error } = tryToParsePath(source);
    if (error || !regexStr) {
      throw error ?? new Error(`invalid matcher ${source}`);
    }
    return new RegExp(regexStr).test(pathname);
  });
}

describe("public/llms.txt", () => {
  it("is the Party Time agent file (not Big Send; no Vercel/Neon how-to)", () => {
    expect(LLMS_TXT).toBe(`# Party Time

> Private event pages from a messy plan. Guests get an unguessable link — not a group-chat password.

Live: https://party.narula.xyz
Human: Get started on the landing page, or try /demo.

## For agents

Create a draft (no auth):
POST https://party.narula.xyz/api/admin/trips
Body: { "plan": "…messy notes…", "preset": "night-out" | "weekend" }  // preset optional
201: organizer packet with hostUrl + adminToken. guestUrl is null until publish.
Never auto-publishes. Publish is host-only (site Publish, or POST /api/admin/trips/:slug/publish with Bearer adminToken).

Same extract path as the landing “Create draft” button. Extract only — never invent time, place, address, or headcount.
Guest RSVP stays on the guest page (/g/…); don’t try to RSVP via the API.

## Machine surface

- OpenAPI: GET /api/openapi.json
- Docs: https://github.com/narulaskaran/bachelor-party/blob/main/docs/api.md
- CLI: bigsend (pnpm bigsend)
- MCP: pnpm mcp

Point at OpenAPI + docs/api.md for verbs. Product name is Party Time (not Big Send).
`);
    expect(LLMS_TXT).toMatch(/^# Party Time\n/);
    expect(LLMS_TXT).not.toMatch(/Big Send(?!\))/);
    expect(LLMS_TXT.toLowerCase()).not.toMatch(/vercel|neon|openrouter/);
  });

  it("is excluded from the guest proxy matcher, same as favicon.ico", () => {
    expect(GUEST_PATH_MATCHER).toContain("llms.txt");
    expect(proxyMatcherHits("/llms.txt")).toBe(false);
    expect(proxyMatcherHits("/favicon.ico")).toBe(false);
    expect(proxyMatcherHits("/icon.svg")).toBe(false);
    expect(proxyMatcherHits("/this-does-not-exist-xyzzy")).toBe(true);
  });

  it("does not rewrite or redirect /llms.txt when proxy still runs", async () => {
    const res = await proxy(new NextRequest("http://localhost/llms.txt"));
    expect(res.status).not.toBe(308);
    expect(res.status).not.toBe(307);
    expect(res.headers.get("Location")).toBeNull();
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("is not a next.config redirect source", async () => {
    const redirects = nextConfig.redirects ? await nextConfig.redirects() : [];
    expect(redirects.some((rule) => rule.source === "/llms.txt")).toBe(false);
  });
});
