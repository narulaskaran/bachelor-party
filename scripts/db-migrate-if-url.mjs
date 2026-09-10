// Apply pending Drizzle migrations when DATABASE_URL is available (Vercel
// builds). Skips silently in local builds without a database.
//
// Uses `drizzle-orm`'s programmatic migrator instead of shelling out to
// `drizzle-kit migrate`. Two reasons:
// 1. Versioned SQL files (./drizzle) applied via a tracked journal table,
//    instead of `drizzle-kit push`'s live schema diffing. `push` is meant
//    for prototyping — its data-loss heuristics can render an interactive
//    confirmation prompt that isn't gated by `--force` (the
//    create_unique_constraint case), and in Vercel's non-TTY build
//    environment that prompt rejects while drizzle-kit's push command
//    swallows the rejection internally and still exits 0. That's exactly
//    how this project's `admin_token` unique constraint silently failed to
//    apply in production — see #15 and #18.
// 2. The `drizzle-kit migrate` CLI's spinner UI writes ANSI clear-line
//    codes meant for a real terminal. In a piped/non-TTY log capture (like
//    Vercel's build logs) those codes can wipe out the actual error text
//    before it's captured, leaving just "exited with 1" and no diagnostic.
//    Calling the migrator directly gives a real JS Error with a stack
//    trace on failure, and its exit code is trustworthy either way.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

function latestMigrationTag() {
  try {
    const journal = JSON.parse(
      readFileSync(join("drizzle", "meta", "_journal.json"), "utf8"),
    );
    const last = journal.entries?.at?.(-1);
    return typeof last?.tag === "string" ? last.tag : "unknown";
  } catch {
    return "unknown";
  }
}

if (!process.env.DATABASE_URL) {
  // Production deploys must migrate. Skipping here is how a SQL function can
  // be missing at runtime while the app still calls it.
  if (process.env.VERCEL_ENV === "production") {
    console.error("db-migrate: DATABASE_URL not set in production; refusing to skip");
    process.exit(1);
  }
  console.log("db-migrate: DATABASE_URL not set, skipping migrations");
  process.exit(0);
}

try {
  const db = drizzle(neon(process.env.DATABASE_URL));
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log(`db-migrate: migrations applied (latest ${latestMigrationTag()})`);
} catch (err) {
  console.error("db-migrate: migration failed");
  console.error(err);
  process.exit(1);
}
