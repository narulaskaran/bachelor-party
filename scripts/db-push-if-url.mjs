// Push the Drizzle schema when DATABASE_URL is available (Vercel builds).
// Skips silently in local builds without a database. drizzle-kit push is
// idempotent, so running it on every deploy is safe.
import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.log("db-push: DATABASE_URL not set, skipping schema push");
  process.exit(0);
}

const result = spawnSync("npx", ["drizzle-kit", "push", "--force"], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
