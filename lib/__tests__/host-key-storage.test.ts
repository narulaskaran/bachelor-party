/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import {
  hostKeyBannerHiddenKey,
  hostKeyStorageKey,
  isHostKeyBannerHidden,
  readStoredHostKey,
  rememberHostKey,
  setHostKeyBannerHidden,
} from "@/lib/host-key-storage";

describe("host key tab storage", () => {
  it("remembers and reads a host key without logging it", () => {
    sessionStorage.clear();
    const slug = "friday-drinks";
    expect(readStoredHostKey(slug)).toBeUndefined();
    rememberHostKey(slug, "  party-tok  ");
    expect(readStoredHostKey(slug)).toBe("party-tok");
    expect(sessionStorage.getItem(hostKeyStorageKey(slug))).toBe("party-tok");
    rememberHostKey(slug, "   ");
    expect(readStoredHostKey(slug)).toBe("party-tok");
  });

  it("persists host-key banner hide without clearing the stored key", () => {
    sessionStorage.clear();
    const slug = "friday-drinks";
    rememberHostKey(slug, "party-tok");
    expect(isHostKeyBannerHidden(slug)).toBe(false);
    setHostKeyBannerHidden(slug, true);
    expect(isHostKeyBannerHidden(slug)).toBe(true);
    expect(sessionStorage.getItem(hostKeyBannerHiddenKey(slug))).toBe("1");
    expect(readStoredHostKey(slug)).toBe("party-tok");
    setHostKeyBannerHidden(slug, false);
    expect(isHostKeyBannerHidden(slug)).toBe(false);
    expect(readStoredHostKey(slug)).toBe("party-tok");
  });
});
