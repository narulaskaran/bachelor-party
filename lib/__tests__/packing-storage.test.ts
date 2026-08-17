import { describe, expect, it } from "vitest";
import {
  packingStorageKey,
  parsePackingChecks,
  serializePackingChecks,
} from "@/lib/packing-storage";

describe("packingStorageKey", () => {
  it("is per trip slug", () => {
    expect(packingStorageKey("demo")).toBe("bigsend:pack:demo");
    expect(packingStorageKey("cabin")).toBe("bigsend:pack:cabin");
  });
});

describe("parsePackingChecks", () => {
  it("reads checked titles and ignores junk", () => {
    expect(parsePackingChecks(null)).toEqual({});
    expect(parsePackingChecks("not-json")).toEqual({});
    expect(parsePackingChecks('["Government ID"]')).toEqual({});
    expect(parsePackingChecks('{"Government ID":true,"Layers":false}')).toEqual({
      "Government ID": true,
    });
  });
});

describe("serializePackingChecks", () => {
  it("persists only checked titles", () => {
    expect(serializePackingChecks({ "Government ID": true, Layers: false })).toBe(
      '{"Government ID":true}',
    );
  });
});
