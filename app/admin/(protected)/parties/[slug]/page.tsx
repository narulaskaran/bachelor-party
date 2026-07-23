import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { PartyForm } from "../party-form";

type Params = { params: Promise<{ slug: string }> };

export default async function EditPartyPage({ params }: Params) {
  const { slug } = await params;
  const db = getDb();
  if (!db) {
    return (
      <div className="mx-auto max-w-4xl py-20 text-center">
        <p className="text-sm text-muted-foreground">
          Database unavailable — can&apos;t load this party.
        </p>
      </div>
    );
  }

  const [party] = await db
    .select({ content: schema.parties.content })
    .from(schema.parties)
    .where(eq(schema.parties.slug, slug))
    .limit(1);

  if (!party) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Edit {slug}</h1>
        <Link href="/admin" className="text-sm text-muted-foreground underline underline-offset-4">
          ← Back to dashboard
        </Link>
      </div>
      <PartyForm mode="edit" slug={slug} initialContent={party.content} />
    </div>
  );
}
