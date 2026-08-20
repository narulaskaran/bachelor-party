import { describe, expect, it } from "vitest";
import { calendarDateInZone, isIanaTimeZone, settledTimeZone } from "@/lib/timezones";

describe("event time zones", () => {
  it("accepts IANA zones and rejects abbreviations", () => {
    expect(isIanaTimeZone("America/Denver")).toBe(true);
    expect(isIanaTimeZone("UTC")).toBe(true);
    expect(isIanaTimeZone("ET")).toBe(false);
    expect(isIanaTimeZone("Mountain Time")).toBe(false);
    expect(settledTimeZone(" ET ")).toBeUndefined();
    expect(settledTimeZone("America/Los_Angeles")).toBe("America/Los_Angeles");
  });

  it("reads the calendar date in the event zone, not the viewer clock", () => {
    const lateUtc = new Date("2026-09-05T05:30:00Z");
    expect(calendarDateInZone(lateUtc, "UTC")).toBe("2026-09-05");
    expect(calendarDateInZone(lateUtc, "America/Los_Angeles")).toBe("2026-09-04");
  });
});
