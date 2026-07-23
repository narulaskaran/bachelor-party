// Push the Drizzle schema when DATABASE_URL is available (Vercel builds).
// Skips silently in local builds without a database. drizzle-kit push is
// idempotent, so running it on every deploy is safe.
import { spawnSync } from "node:child_process";

// drizzle-kit's `create_unique_constraint` confirmation prompt (asking
// whether to truncate a non-empty table) ignores `--force` and renders an
// interactive select regardless. In a non-TTY environment (Vercel builds)
// that prompt rejects with this message — and drizzle-kit's push command
// catches the rejection internally and exits 0 anyway, so the schema change
// silently never applies. See #15.
const UNRECOVERABLE_FAILURE_PATTERNS = [/Interactive prompts require a TTY/];

export function containsUnrecoverableDrizzleFailure(output) {
  return UNRECOVERABLE_FAILURE_PATTERNS.some((pattern) => pattern.test(output));
}

// Only run the CLI + exit when this file is executed directly, so the
// exported helper above can be unit tested without shelling out.
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  if (!process.env.DATABASE_URL) {
    console.log("db-push: DATABASE_URL not set, skipping schema push");
    process.exit(0);
  }

  const result = spawnSync("npx", ["drizzle-kit", "push", "--force"], {
    encoding: "utf8",
  });

  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");

  const combinedOutput = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (containsUnrecoverableDrizzleFailure(combinedOutput)) {
    console.error(
      "db-push: drizzle-kit hit a non-TTY confirmation prompt and silently skipped applying schema changes (exited 0 despite failing). Failing the build so schema drift can't ship unnoticed — see issue #15."
    );
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}
