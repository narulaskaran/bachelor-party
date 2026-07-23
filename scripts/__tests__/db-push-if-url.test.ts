import { describe, it, expect } from "vitest";
import { containsUnrecoverableDrizzleFailure } from "../db-push-if-url.mjs";

describe("containsUnrecoverableDrizzleFailure", () => {
  it("detects drizzle-kit's non-TTY prompt rejection", () => {
    const output =
      "[✓] Pulling schema from database...\n" +
      "Error: Interactive prompts require a TTY terminal (process.stdin.isTTY or process.stdout.isTTY is false). This can happen when running in CI, piped input, or non-interactive shells.\n" +
      "    at render10 (/vercel/path0/node_modules/drizzle-kit/bin.cjs:1450:31)";
    expect(containsUnrecoverableDrizzleFailure(output)).toBe(true);
  });

  it("returns false for normal successful output", () => {
    const output = "[i] No changes detected";
    expect(containsUnrecoverableDrizzleFailure(output)).toBe(false);
  });

  it("returns false for empty output", () => {
    expect(containsUnrecoverableDrizzleFailure("")).toBe(false);
  });
});
