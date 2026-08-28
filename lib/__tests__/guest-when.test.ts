import { describe, expect, it } from "vitest";
import { formatGuestWhen, formatGuestWhere } from "@/lib/guest-when";
import { scheduleFromRows } from "@/lib/schedule-rows";

describe("formatGuestWhen", () => {
  it("shows a zoned clock and hides an unzoned clock as time TBD", () => {
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
    expect(
      formatGuestWhen({
        siteName: "Dinner",
        startDate: "2026-09-04",
        startTime: "19:00",
      }),
    ).toBe("Fri, Sep 4 · time TBD");
    expect(
      formatGuestWhen({
        siteName: "Dinner",
        startDate: "2026-09-04",
        startTime: "7:00 PM",
      }),
    ).not.toMatch(/7:00 PM/);
  });

  it("keeps the end date when a start clock and IANA zone exist", () => {
    expect(
      formatGuestWhen({
        siteName: "Cabin weekend",
        startDate: "2026-09-04",
        endDate: "2026-09-06",
        startTime: "19:00",
        timezone: "America/Denver",
      }),
    ).toMatch(/Fri, Sep 4 – Sun, Sep 6, 7:00 PM M[DS]T/);
    expect(
      formatGuestWhen({
        siteName: "Cabin weekend",
        startDate: "2026-09-04",
        endDate: "2026-09-06",
        startTime: "19:00",
      }),
    ).toBe("Fri, Sep 4 – Sun, Sep 6 · time TBD");
  });

  it("keeps a same-day start and end as a single date plus time", () => {
    expect(
      formatGuestWhen({
        siteName: "Dinner",
        startDate: "2026-09-04",
        endDate: "2026-09-04",
        startTime: "19:00",
        timezone: "America/Denver",
      }),
    ).toMatch(/Fri, Sep 4, 7:00 PM M[DS]T/);
    expect(
      formatGuestWhen({
        siteName: "Cabin weekend",
        startDate: "2026-09-04",
        endDate: "2026-09-04",
        startTime: "19:00",
        timezone: "America/Denver",
      }),
    ).not.toMatch(/Sep 4 –/);
  });

  it("does not format an inverted end-before-start range", () => {
    expect(
      formatGuestWhen({
        siteName: "Cabin weekend",
        startDate: "2026-09-04",
        endDate: "2026-09-01",
      }),
    ).toBeUndefined();
  });
});

describe("formatGuestWhere", () => {
  it("keeps address and maps without a place name", () => {
    expect(formatGuestWhere({ siteName: "Dinner", address: "123 Main St" })).toEqual({
      address: "123 Main St",
    });
    expect(
      formatGuestWhere({ siteName: "Dinner", mapsUrl: "https://maps.example.com/x" }),
    ).toEqual({
      mapsUrl: "https://maps.example.com/x",
    });
    expect(
      formatGuestWhere({
        siteName: "Dinner",
        address: "123 Main St",
        mapsUrl: "https://maps.example.com/x",
      }),
    ).toEqual({
      address: "123 Main St",
      mapsUrl: "https://maps.example.com/x",
    });
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
