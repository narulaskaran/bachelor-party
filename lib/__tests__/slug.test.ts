import { describe, it, expect } from "vitest";
import { isReservedSlug, isUnguessableEventSlug, RESERVED_SLUGS, slugFromName, unguessableEventSlug, uniqueSlug } from "@/lib/slug";

describe("slugFromName", () => {
  it("lowercases and kebab-cases a display name", () => {
    expect(slugFromName("Jackson Hole '26")).toBe("jackson-hole-26");
  });

  it("strips punctuation and collapses dashes", () => {
    expect(slugFromName("  Alpine Weekend!! ")).toBe("alpine-weekend");
  });

  it("returns empty string when nothing usable remains", () => {
    expect(slugFromName("!!!")).toBe("");
  });
});

describe("uniqueSlug", () => {
  it("returns the base when it is free", async () => {
    expect(await uniqueSlug("jackson-hole-26", async () => false)).toBe("jackson-hole-26");
  });

  it("appends -2, -3, … until a free candidate", async () => {
    const taken = new Set(["cabin", "cabin-2"]);
    expect(await uniqueSlug("cabin", (c) => taken.has(c))).toBe("cabin-3");
  });

  it("falls back to 'trip' when the base is empty", async () => {
    expect(await uniqueSlug("", async () => false)).toBe("trip");
  });

  it("skips reserved app-route names even when the DB is empty", async () => {
    expect(await uniqueSlug("admin", async () => false)).toBe("admin-2");
    expect(await uniqueSlug("api", async () => false)).toBe("api-2");
    expect(await uniqueSlug("demo", async () => false)).toBe("demo-2");
  });

  it("skips reserved names and existing trips together", async () => {
    const taken = new Set(["admin-2", "admin-3"]);
    expect(await uniqueSlug("admin", (c) => taken.has(c))).toBe("admin-4");
  });
});

describe("isReservedSlug", () => {
  it("covers live App Router first segments and the built-in demo trip", () => {
    for (const slug of [
      "admin",
      "api",
      "rsvp",
      "schedule",
      "activities",
      "basecamp",
      "login",
      "demo",
    ]) {
      expect(isReservedSlug(slug)).toBe(true);
      expect(RESERVED_SLUGS).toContain(slug);
    }
    expect(isReservedSlug("jackson-hole-26")).toBe(false);
    expect(isReservedSlug("admin-2")).toBe(false);
  });
});

describe("unguessableEventSlug", () => {
  it("is a random guest path, not the event name", () => {
    const slug = unguessableEventSlug();
    expect(isUnguessableEventSlug(slug)).toBe(true);
    expect(slug).not.toContain("cabin");
    expect(unguessableEventSlug()).not.toBe(slug);
  });
});
