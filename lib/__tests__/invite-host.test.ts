import { describe, expect, it } from "vitest";
import { DEFAULT_INVITE_HOST, inviteHostFromHeaders } from "@/lib/invite-host";

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
});
