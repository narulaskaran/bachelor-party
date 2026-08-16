import { describe, expect, it } from "vitest";
import { countdownLabel, daysUntil } from "@/lib/countdown";

const noon = (iso: string) => new Date(`${iso}T12:00:00`);

describe("countdownLabel", () => {
  it("says N days to go for a trip a couple of weeks out", () => {
    expect(countdownLabel("2026-08-30", noon("2026-08-16"))).toBe("14 days to go");
  });

  it("says This weekend when the trip is 0–2 days away", () => {
    expect(countdownLabel("2026-08-16", noon("2026-08-16"))).toBe("This weekend");
    expect(countdownLabel("2026-08-17", noon("2026-08-16"))).toBe("This weekend");
    expect(countdownLabel("2026-08-18", noon("2026-08-16"))).toBe("This weekend");
  });

  it("hides the countdown when the trip is more than a year out", () => {
    expect(countdownLabel("2030-08-30", noon("2026-08-16"))).toBeNull();
    expect(daysUntil("2030-08-30", noon("2026-08-16"))).toBeGreaterThan(365);
  });

  it("does not use T-minus jargon", () => {
    expect(countdownLabel("2026-09-04", noon("2026-08-16"))).not.toMatch(/T-minus/i);
  });

  it("marks past trips as in the books", () => {
    expect(countdownLabel("2026-08-01", noon("2026-08-16"))).toBe("In the books");
  });
});
