import type { SQLWrapper } from "drizzle-orm";

export type SqlExecutor = {
  execute?: (query: SQLWrapper) => unknown;
};

/**
 * Run a drizzle SQL snippet via `db.execute`.
 * Always call as a method (`db.execute(query)`). Extracting the function
 * drops neon-http's `this` and throws
 * `TypeError: Cannot read properties of undefined (reading 'dialect')`.
 */
export async function executeSql(
  db: SqlExecutor,
  query: SQLWrapper,
): Promise<boolean> {
  if (typeof db.execute !== "function") return false;
  await db.execute(query);
  return true;
}
