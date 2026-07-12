// Seed or update a party from a local JSON file (kept out of git).
//
//   DATABASE_URL='postgres://…' npm run seed party-data/my-party.json
//
// JSON shape: { "slug": "...", "password": "...", "content": { …PartyContent } }
// Upserts by slug, so re-running with edits updates the party in place.
import { neon } from "@neondatabase/serverless";
import fs from "node:fs";

const file = process.argv[2];
if (!file || !process.env.DATABASE_URL) {
  console.error(
    "Usage: DATABASE_URL='postgres://…' npm run seed <party-file.json>"
  );
  process.exit(1);
}

const { slug, password, content } = JSON.parse(fs.readFileSync(file, "utf8"));
if (!slug || !password || !content?.trip) {
  console.error("Party file needs top-level slug, password, and content.trip");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
await sql`
  INSERT INTO parties (slug, password, content)
  VALUES (${slug}, ${password}, ${JSON.stringify(content)}::jsonb)
  ON CONFLICT (slug) DO UPDATE
    SET password = EXCLUDED.password,
        content = EXCLUDED.content,
        updated_at = now()
`;
console.log(`Seeded party '${slug}' (${content.trip.siteName})`);
