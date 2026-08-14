import { describe, it, expect } from "vitest";
import { mergePatch } from "@/lib/merge-patch";

describe("mergePatch (RFC 7396)", () => {
  it("deletes a key when the patch value is null", () => {
    expect(mergePatch({ a: 1, b: 2 }, { b: null })).toEqual({ a: 1 });
  });

  it("adds a nested schedule day without wiping lodging", () => {
    const target = {
      trip: { siteName: "Jackson Hole '26" },
      lodging: { name: "Cabin" },
    };
    const patched = mergePatch(target, {
      schedule: [
        {
          key: "saturday",
          date: "2026-09-05",
          weekday: "Saturday",
          label: "Dinner",
          timed: true,
          entries: [{ title: "Dinner", time: "7:00 PM" }],
        },
      ],
    }) as typeof target & {
      schedule: { entries: { title: string }[] }[];
    };
    expect(patched.lodging).toEqual({ name: "Cabin" });
    expect(patched.trip.siteName).toBe("Jackson Hole '26");
    expect(patched.schedule).toHaveLength(1);
    expect(patched.schedule[0].entries[0].title).toBe("Dinner");
  });

  it("replaces arrays instead of merging them by index", () => {
    expect(mergePatch({ tags: ["a", "b"] }, { tags: ["c"] })).toEqual({ tags: ["c"] });
  });

  it("recurses into nested objects", () => {
    expect(mergePatch({ trip: { siteName: "A", airport: "DEN" } }, { trip: { airport: "JAC" } })).toEqual({
      trip: { siteName: "A", airport: "JAC" },
    });
  });
});
