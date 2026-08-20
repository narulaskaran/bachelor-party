import { describe, it, expect } from "vitest";
import { groupInviteText, organizerPacket } from "@/lib/organizer-packet";

describe("organizerPacket", () => {
  it("builds a guest URL from the request origin", () => {
    const request = new Request("https://preview.example/api/admin/parties");
    expect(
      organizerPacket(request, {
        slug: "jackson-hole-26",
        password: "secret-pw",
        adminToken: "tok",
      }),
    ).toEqual({
      url: "https://preview.example/jackson-hole-26/host",
      slug: "jackson-hole-26",
      password: "secret-pw",
      adminToken: "tok",
    });
  });

  it("mints party.narula.xyz invites when the request host is the old Vercel alias", () => {
    expect(
      organizerPacket(
        new Request("https://bachelor-party-eight.vercel.app/api/admin/trips"),
        {
          slug: "jackson-hole-26",
          password: "secret-pw",
          adminToken: "tok",
        },
      ).url,
    ).toBe("https://party.narula.xyz/jackson-hole-26/host");
  });

  it("keeps Vercel preview origins so preview packets stay on the preview host", () => {
    expect(
      organizerPacket(
        new Request(
          "https://bachelor-party-eight-git-feat-acme.vercel.app/api/admin/trips",
        ),
        {
          slug: "jackson-hole-26",
          password: "secret-pw",
          adminToken: "tok",
        },
      ).url,
    ).toBe("https://bachelor-party-eight-git-feat-acme.vercel.app/jackson-hole-26/host");
  });
});

describe("groupInviteText", () => {
  it("includes the invite URL and guest password, not the host key", () => {
    const text = groupInviteText({
      url: "https://party.narula.xyz/cabin-weekend",
      password: "guest-pw",
    });
    expect(text).toContain("https://party.narula.xyz/cabin-weekend");
    expect(text).toContain("guest-pw");
    expect(text).not.toMatch(/host key|admin token|party-tok/i);
  });
});
