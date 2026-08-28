import { describe, expect, it } from "vitest";
import { isHostPathname, pathnameFromHeaders, REQUEST_PATHNAME_HEADER } from "@/lib/request-pathname";

describe("pathnameFromHeaders", () => {
  it("accepts the proxy pathname header and ignores junk", () => {
    expect(
      pathnameFromHeaders(new Headers({ [REQUEST_PATHNAME_HEADER]: "/g/aabbcc" })),
    ).toBe("/g/aabbcc");
    expect(pathnameFromHeaders(new Headers({ [REQUEST_PATHNAME_HEADER]: "g/secret" }))).toBeNull();
    expect(pathnameFromHeaders(new Headers())).toBeNull();
  });

  it("detects the organizer /host workspace without treating guest paths as host", () => {
    expect(isHostPathname("/cabin-weekend/host", "cabin-weekend")).toBe(true);
    expect(isHostPathname("/cabin-weekend", "cabin-weekend")).toBe(false);
    expect(isHostPathname("/g/aabbcc", "cabin-weekend")).toBe(false);
    expect(isHostPathname("/demo/host", "demo")).toBe(true);
    expect(isHostPathname("/demo/host", "cabin-weekend")).toBe(false);
  });
});
