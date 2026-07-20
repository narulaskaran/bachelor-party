// /admin — read-only party list table (Phase 1).
// Follows the same Drizzle query shape as app/api/admin/parties/route.ts.

import Link from "next/link";
import { getDb, schema } from "@/lib/db";
import * as drizzle from "drizzle-orm";
import type { PartyContent } from "@/lib/party-types";

export default async function Page() {
  const db = getDb();
  if (!db) {
    return (
      <div className="mx-auto max-w-4xl py-20 text-center">
        <p className="text-sm text-muted-foreground">
          Database unavailable — can't load parties.
        </p>
      </div>
    );
  }

  // Query shape mirrors app/api/admin/parties/route.ts.
  const rows = await db
    .select({
      id: schema.parties.id,
      slug: schema.parties.slug,
      content: schema.parties.content as PartyContent,
      updatedAt: schema.parties.updatedAt,
      guestCount: drizzle.count(schema.guests.id),
    })
    .from(schema.parties)
    .leftJoin(
      schema.guests,
      drizzle.eq(schema.guests.partyId, schema.parties.id) as any // drizzle leftJoin typing quirk
    )
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
            <th className="text-left px-3 py-2 font-medium">Groom</th>
            <th className="text-left px-3 py-2 font-medium">Date</th>
            <th className="text-center px-3 py-2 font-medium">Guests</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b hover:bg-muted/30">
              <td className="px-3 py-2 font-medium">
                {(row.content as any)?.trip?.siteName ?? "\u2014"}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {(row.content as any)?.trip?.groomName ?? "\u2014"}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {(row.content as any)?.trip?.dateLabel}
              </td>
              <td className="px-3 py-2 text-center">{Number(row.guestCount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-4 text-xs text-muted-foreground">
        {rows.length} party{rows.length !== 1 ? "ies" : ""}. Row-click \u2192 edit (Phase 2).
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
      <p className="py-8 text-center text-muted-foreground">No parties yet.</p>
    </div>
  );
}
