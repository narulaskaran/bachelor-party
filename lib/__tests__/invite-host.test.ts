import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  CANONICAL_ORIGIN,
  DEFAULT_INVITE_HOST,
  canonicalRedirectLocation,
  inviteHostFromHeaders,
  isLegacyProductionHost,
  legacyProductionHostRedirects,
  publicOriginFromRequest,
} from "@/lib/invite-host";

describe("inviteHostFromHeaders", () => {
  it("prefers x-forwarded-host so previews match the request", () => {
    expect(
      inviteHostFromHeaders({
        get: (name) =>
          name === "x-forwarded-host"
            ? "preview.vercel.app"
            : name === "host"
              ? "localhost:3000"
              : null,
      }),
    ).toBe("preview.vercel.app");
  });

  it("falls back to host, then production", () => {
    expect(
      inviteHostFromHeaders({
        get: (name) => (name === "host" ? "localhost:3000" : null),
      }),
    ).toBe("localhost:3000");
    expect(inviteHostFromHeaders({ get: () => null })).toBe(DEFAULT_INVITE_HOST);
  });

  it("uses the first forwarded host when several are listed", () => {
    expect(
      inviteHostFromHeaders({
        get: (name) =>
          name === "x-forwarded-host" ? "party.narula.xyz, vercel.app" : null,
      }),
    ).toBe("party.narula.xyz");
  });

  it("canonicalizes the retired Vercel production alias, not preview hosts", () => {
    expect(
      inviteHostFromHeaders({
        get: (name) =>
          name === "x-forwarded-host" ? "bachelor-party-eight.vercel.app" : null,
      }),
    ).toBe(DEFAULT_INVITE_HOST);
    expect(
      inviteHostFromHeaders({
        get: (name) =>
          name === "host" ? "www.bachelor-party-eight.vercel.app" : null,
      }),
    ).toBe(DEFAULT_INVITE_HOST);
    expect(
      inviteHostFromHeaders({
        get: (name) =>
          name === "x-forwarded-host"
            ? "bachelor-party-eight-git-feat-acme.vercel.app"
            : null,
      }),
    ).toBe("bachelor-party-eight-git-feat-acme.vercel.app");
  });
});

describe("isLegacyProductionHost", () => {
  it("matches only the retired production alias (and www)", () => {
    expect(isLegacyProductionHost("bachelor-party-eight.vercel.app")).toBe(true);
    expect(isLegacyProductionHost("www.bachelor-party-eight.vercel.app")).toBe(true);
    expect(isLegacyProductionHost("Bachelor-Party-Eight.Vercel.App")).toBe(true);
    expect(isLegacyProductionHost("localhost:3000")).toBe(false);
    expect(isLegacyProductionHost("party.narula.xyz")).toBe(false);
    expect(
      isLegacyProductionHost("bachelor-party-eight-git-feat-acme.vercel.app"),
    ).toBe(false);
  });
});

describe("publicOriginFromRequest", () => {
  it("keeps localhost and preview origins", () => {
    expect(
      publicOriginFromRequest(new Request("http://localhost:3000/api/admin/trips")),
    ).toBe("http://localhost:3000");
    expect(
      publicOriginFromRequest(
        new Request("https://bachelor-party-eight-git-feat-acme.vercel.app/api/admin/trips"),
      ),
    ).toBe("https://bachelor-party-eight-git-feat-acme.vercel.app");
  });

  it("rewrites the retired Vercel production alias to party.narula.xyz", () => {
    expect(
      publicOriginFromRequest(
        new Request("https://bachelor-party-eight.vercel.app/api/admin/trips"),
      ),
    ).toBe(CANONICAL_ORIGIN);
    expect(
      publicOriginFromRequest(
        new Request("https://internal.example/api/admin/trips", {
          headers: { "x-forwarded-host": "bachelor-party-eight.vercel.app" },
        }),
      ),
    ).toBe(CANONICAL_ORIGIN);
  });
});

describe("canonicalRedirectLocation", () => {
  it("308-targets party.narula.xyz with path and query on the old alias", () => {
    const request = new NextRequest(
      "https://bachelor-party-eight.vercel.app/demo?from=bookmark",
    );
    expect(canonicalRedirectLocation(request)?.href).toBe(
      "https://party.narula.xyz/demo?from=bookmark",
    );
  });

  it("does not redirect localhost or Vercel preview hosts", () => {
    expect(
      canonicalRedirectLocation(new NextRequest("http://localhost:3000/")),
    ).toBeNull();
    expect(
      canonicalRedirectLocation(
        new NextRequest("https://bachelor-party-eight-git-feat-acme.vercel.app/demo"),
      ),
    ).toBeNull();
    expect(
      canonicalRedirectLocation(new NextRequest("https://party.narula.xyz/")),
    ).toBeNull();
  });
});

describe("legacyProductionHostRedirects", () => {
  it("permanently sends the old Vercel alias (and www) to the canonical origin", () => {
    const rules = legacyProductionHostRedirects();
    expect(rules).toContainEqual({
      source: "/",
      has: [{ type: "host", value: "bachelor-party-eight.vercel.app" }],
      destination: "https://party.narula.xyz/",
      permanent: true,
    });
    expect(rules).toContainEqual({
      source: "/:path*",
      has: [{ type: "host", value: "bachelor-party-eight.vercel.app" }],
      destination: "https://party.narula.xyz/:path*",
      permanent: true,
    });
    expect(rules).toContainEqual({
      source: "/:path*",
      has: [{ type: "host", value: "www.bachelor-party-eight.vercel.app" }],
      destination: "https://party.narula.xyz/:path*",
      permanent: true,
    });
    expect(JSON.stringify(rules)).not.toMatch(/git-.*\.vercel\.app/);
  });
});
