import { describe, expect, it } from "vitest";
import { landingPanelHash, panelFromHash } from "@/lib/landing-panel";
import { LEGACY_PAGE_HASHES } from "@/lib/legacy-page-redirects";

describe("panelFromHash", () => {
  it("maps the create hash and ignores invite leftovers", () => {
    expect(panelFromHash("#create")).toBe("create");
    expect(panelFromHash("create")).toBe("create");
    expect(panelFromHash("#enter")).toBeNull();
    expect(landingPanelHash("create")).toBe("#create");
  });

  it("does not open a landing panel for retired page hashes", () => {
    for (const hash of LEGACY_PAGE_HASHES) {
      expect(panelFromHash(`#${hash}`), `#${hash}`).toBeNull();
    }
  });

  it("ignores an empty or unknown hash", () => {
    expect(panelFromHash("")).toBeNull();
    expect(panelFromHash("#")).toBeNull();
    expect(panelFromHash("#lodge")).toBeNull();
  });
});
