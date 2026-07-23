import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "db-migrate-if-url.mjs"
);

describe("db-migrate-if-url.mjs", () => {
  it("skips migrations and exits 0 when DATABASE_URL is unset", () => {
    const env = { ...process.env };
    delete env.DATABASE_URL;
    const output = execFileSync("node", [scriptPath], { env, encoding: "utf8" });
    expect(output).toContain("DATABASE_URL not set, skipping migrations");
  });
});
