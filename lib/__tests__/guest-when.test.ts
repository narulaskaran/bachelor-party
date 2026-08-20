import { describe, expect, it } from "vitest";
import { formatGuestWhen } from "@/lib/guest-when";
import { scheduleFromRows } from "@/lib/schedule-rows";

describe("formatGuestWhen", () => {
  it("formats a zoned clock time and keeps timezone-free times as TBD", () => {
    expect(
      formatGuestWhen({
        siteName: "Dinner",
        startDate: "2026-09-04",
        startTime: "19:00",
        timezone: "America/Denver",
      }),
    ).toMatch(/Fri, Sep 4, 7:00 PM M[DS]T/);
    expect(
      formatGuestWhen({
        siteName: "Dinner",
        startDate: "2026-09-04",
        startTime: "7:00 PM",
      }),
    ).toBe("Fri, Sep 4 · time TBD");
  });
});

describe("scheduleFromRows", () => {
  it("groups host editor rows into schedule days", () => {
    expect(
      scheduleFromRows([
        { date: "2026-09-04", time: "7:00 PM", title: "Dinner", note: "Rita's" },
        { date: "2026-09-04", time: "", title: "Nightcap", note: "" },
      ]),
    ).toEqual([
      {
        key: "2026-09-04",
        date: "2026-09-04",
        weekday: "Friday",
        label: "Friday",
        timed: true,
        entries: [
          { title: "Dinner", time: "7:00 PM", note: "Rita's" },
          { title: "Nightcap" },
        ],
      },
    ]);
  });
});
