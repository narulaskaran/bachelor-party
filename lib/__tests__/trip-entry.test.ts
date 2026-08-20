import { describe, it, expect } from "vitest";
import { tripPathFromInput, tripSlugFromInput } from "@/lib/trip-entry";

describe("tripSlugFromInput", () => {
  it("returns null for empty or punctuation-only input", () => {
    expect(tripSlugFromInput("")).toBeNull();
    expect(tripSlugFromInput("   ")).toBeNull();
    expect(tripSlugFromInput("!!!")).toBeNull();
  });

  it("accepts a kebab-case trip code", () => {
    expect(tripSlugFromInput("jackson-hole-26")).toBe("jackson-hole-26");
  });

  it("strips a leading slash", () => {
    expect(tripSlugFromInput("/jackson-hole-26")).toBe("jackson-hole-26");
  });

  it("slugifies a display name the same way create does", () => {
    expect(tripSlugFromInput("Jackson Hole '26")).toBe("jackson-hole-26");
  });

  it("extracts the slug from a full invite URL", () => {
    expect(
      tripSlugFromInput("https://bachelor-party-eight.vercel.app/jackson-hole-26"),
    ).toBe("jackson-hole-26");
  });

  it("extracts the slug from a host/path without a scheme", () => {
    expect(tripSlugFromInput("example.com/your-trip")).toBe("your-trip");
  });

  it("ignores query and hash on an invite URL", () => {
    expect(
      tripSlugFromInput("https://example.com/jackson-hole-26?from=sms#rsvp"),
    ).toBe("jackson-hole-26");
  });

  it("returns null when a URL has no trip path", () => {
    expect(tripSlugFromInput("https://example.com/")).toBeNull();
    expect(tripSlugFromInput("example.com")).toBeNull();
  });
});

describe("tripPathFromInput", () => {
  it("returns /{slug} for a usable trip code", () => {
    expect(tripPathFromInput("jackson-hole-26")).toBe("/jackson-hole-26");
  });

  it("returns /g/{token} for a guest invite URL or raw token", () => {
    expect(tripPathFromInput("https://example.com/g/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")).toBe(
      "/g/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
    expect(tripPathFromInput("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")).toBe(
      "/g/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
  });
});
