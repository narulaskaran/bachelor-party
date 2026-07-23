// Apply pending Drizzle migrations when DATABASE_URL is available (Vercel
// builds). Skips silently in local builds without a database.
//
// Uses `drizzle-kit migrate` (versioned SQL files in ./drizzle, applied via
// a tracked journal table) instead of `drizzle-kit push` (live schema
// diffing). `push` is meant for prototyping — its data-loss heuristics can
// render an interactive confirmation prompt that isn't gated by `--force`
// (the create_unique_constraint case), and in Vercel's non-TTY build
// environment that prompt rejects while drizzle-kit's push command catches
// the rejection internally and still exits 0. That's exactly how this
// project's `admin_token` unique constraint silently failed to apply in
// production — see #15 and #18. `migrate` has no such prompt: it just runs
// pending SQL files in order against the journal table and fails loudly on
// a real error, so its exit code can be trusted directly.
import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.log("db-migrate: DATABASE_URL not set, skipping migrations");
  process.exit(0);
}

const result = spawnSync("npx", ["drizzle-kit", "migrate"], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
