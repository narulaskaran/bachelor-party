import { describe, expect, it } from "vitest";
import { pathnameFromHeaders, REQUEST_PATHNAME_HEADER } from "@/lib/request-pathname";

describe("pathnameFromHeaders", () => {
  it("accepts the proxy pathname header and ignores junk", () => {
    expect(
      pathnameFromHeaders(new Headers({ [REQUEST_PATHNAME_HEADER]: "/g/aabbcc" })),
    ).toBe("/g/aabbcc");
    expect(pathnameFromHeaders(new Headers({ [REQUEST_PATHNAME_HEADER]: "g/secret" }))).toBeNull();
    expect(pathnameFromHeaders(new Headers())).toBeNull();
  });
});
