// /admin — read-only trip list (Site / dates / guests).
// Query shape matches lib/admin-api/collection.ts.

import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

export default async function Page() {
  const db = getDb();
  if (!db) {
    return (
      <div className="mx-auto max-w-4xl py-20 text-center">
        <p className="text-sm text-muted-foreground">
          Database unavailable — can&rsquo;t load parties.
        </p>
      </div>
    );
  }

  // Query shape mirrors lib/admin-api/collection.ts.
  const rows = await db
    .select({
      id: schema.parties.id,
      slug: schema.parties.slug,
      content: schema.parties.content,
      updatedAt: schema.parties.updatedAt,
      guestCount: count(schema.guests.id),
    })
    .from(schema.parties)
    .leftJoin(schema.guests, eq(schema.guests.partyId, schema.parties.id))
    .groupBy(schema.parties.id)
    .orderBy(schema.parties.createdAt);

  if (rows.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
        <Link href="/" className="text-sm text-muted-foreground underline underline-offset-4">
          ← Back to site
        </Link>
      </div>

      <table className="w-full table-auto text-sm border-collapse">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left px-3 py-2 font-medium">Site</th>
            <th className="text-left px-3 py-2 font-medium">Date</th>
            <th className="text-center px-3 py-2 font-medium">Guests</th>
            <th className="text-left px-3 py-2 font-medium">Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b hover:bg-muted/30">
              <td className="px-3 py-2 font-medium">
                {row.content?.trip?.siteName ?? "\u2014"}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {row.content?.trip?.dateLabel ?? "\u2014"}
              </td>
              <td className="px-3 py-2 text-center">{Number(row.guestCount)}</td>
              <td className="px-3 py-2 text-muted-foreground">
                {new Date(row.updatedAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-4 text-xs text-muted-foreground">
        {rows.length} trip{rows.length !== 1 ? "s" : ""}. Content is edited via the admin API.
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
        <Link href="/" className="text-sm text-muted-foreground underline underline-offset-4">
          ← Back to site
        </Link>
      </div>
      <p className="py-8 text-center text-muted-foreground">No trips yet.</p>
    </div>
  );
}
