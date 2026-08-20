/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import {
  hostKeyStorageKey,
  readStoredHostKey,
  rememberHostKey,
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
});
