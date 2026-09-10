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
    delete env.VERCEL_ENV;
    const output = execFileSync("node", [scriptPath], { env, encoding: "utf8" });
    expect(output).toContain("DATABASE_URL not set, skipping migrations");
  });

  it("fails a production Vercel build when DATABASE_URL is unset", () => {
    const env: NodeJS.ProcessEnv = { ...process.env, VERCEL_ENV: "production" };
    delete env.DATABASE_URL;
    try {
      execFileSync("node", [scriptPath], { env, encoding: "utf8" });
      throw new Error("expected db-migrate to exit non-zero");
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      const text = `${(err as { stderr?: string }).stderr ?? ""}${(err as Error).message}`;
      expect(text).toContain("DATABASE_URL not set in production; refusing to skip");
    }
  });
});
