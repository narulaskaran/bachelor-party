import { describe, expect, it } from "vitest";
import { guestInvitePath, isGuestInviteToken, publishedGuestPath } from "@/lib/guest-invite";

describe("publishedGuestPath", () => {
  it("uses the minted /g/{token} door when the event has a guest token", () => {
    const token = "f".repeat(32);
    expect(isGuestInviteToken(token)).toBe(true);
    expect(publishedGuestPath({ slug: "cabin-weekend", guestToken: token })).toBe(
      guestInvitePath(token),
    );
    expect(publishedGuestPath({ slug: "cabin-weekend", guestToken: token })).not.toBe(
      "/cabin-weekend",
    );
  });

  it("keeps legacy /{slug} only when there is no guest token", () => {
    expect(publishedGuestPath({ slug: "cabin-weekend" })).toBe("/cabin-weekend");
    expect(publishedGuestPath({ slug: "cabin-weekend", guestToken: null })).toBe("/cabin-weekend");
  });
});
