import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// DATABASE_URL is provisioned by the Neon integration on Vercel.
// Locally it lives in .env.local (vercel env pull). Absent → db is null
// and forms degrade gracefully.
export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return drizzle(neon(url), { schema });
}

export { schema };
