import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("README production links", () => {
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");

  it("points live / create / demo links at party.narula.xyz, not the old Vercel host", () => {
    expect(readme).toContain("https://party.narula.xyz");
    expect(readme).toContain("https://party.narula.xyz/demo");
    expect(readme).not.toContain("bachelor-party-eight.vercel.app");
    expect(readme).toMatch(/host key/i);
    expect(readme).not.toMatch(/admin token/i);
    expect(readme).not.toMatch(/only way to edit/i);
  });
});
