import { describe, it, expect } from "vitest";
import nextConfig from "@/next.config";
import {
  LEGACY_PAGE_HASHES,
  LEGACY_PAGE_REDIRECTS,
} from "@/lib/legacy-page-redirects";

describe("legacy page redirects", () => {
  it("covers the old multi-page paths that 307 to homepage hashes", () => {
    expect([...LEGACY_PAGE_HASHES]).toEqual([
      "schedule",
      "activities",
      "basecamp",
      "rsvp",
    ]);
    expect(LEGACY_PAGE_REDIRECTS).toEqual([
      { source: "/schedule", destination: "/#schedule", permanent: false },
      { source: "/activities", destination: "/#activities", permanent: false },
      { source: "/basecamp", destination: "/#basecamp", permanent: false },
      { source: "/rsvp", destination: "/#rsvp", permanent: false },
    ]);
  });

  it("is what next.config actually redirects", async () => {
    const redirects = nextConfig.redirects
      ? await nextConfig.redirects()
      : [];
    expect(redirects).toEqual([...LEGACY_PAGE_REDIRECTS]);
  });
});
