import { describe, expect, it } from "vitest";
import { landingPanelHash, panelFromHash } from "@/lib/landing-panel";
import { LEGACY_PAGE_HASHES } from "@/lib/legacy-page-redirects";

describe("panelFromHash", () => {
  it("maps create and enter hashes", () => {
    expect(panelFromHash("#create")).toBe("create");
    expect(panelFromHash("create")).toBe("create");
    expect(panelFromHash("#enter")).toBe("enter");
    expect(landingPanelHash("create")).toBe("#create");
    expect(landingPanelHash("enter")).toBe("#enter");
  });

  it("opens the invite panel for retired page hashes", () => {
    for (const hash of LEGACY_PAGE_HASHES) {
      expect(panelFromHash(`#${hash}`), `#${hash}`).toBe("enter");
    }
  });

  it("ignores an empty or unknown hash", () => {
    expect(panelFromHash("")).toBeNull();
    expect(panelFromHash("#")).toBeNull();
    expect(panelFromHash("#lodge")).toBeNull();
  });
});
