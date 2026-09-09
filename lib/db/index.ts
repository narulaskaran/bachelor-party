import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

type DbCache = { url: string; client: Db };

const globalForDb = globalThis as typeof globalThis & {
  __bachelorPartyDb?: DbCache;
};

/**
 * One Neon HTTP + drizzle client per process (and DATABASE_URL).
 * Callers used to construct a new pair on every getDb(); that added
 * setup work on host, guest, RSVP, and admin paths. Stale after env
 * rotation is avoided by keying the cache on the URL.
 */
export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  const cached = globalForDb.__bachelorPartyDb;
  if (cached?.url === url) return cached.client;
  const client = drizzle(neon(url), { schema });
  globalForDb.__bachelorPartyDb = { url, client };
  return client;
}

/** Drop the cached client. Tests use this so cases do not leak across URLs. */
export function resetDb() {
  delete globalForDb.__bachelorPartyDb;
}

export { schema };
