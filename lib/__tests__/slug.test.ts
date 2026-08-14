import { describe, it, expect } from "vitest";
import { slugFromName, uniqueSlug } from "@/lib/slug";

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
});
