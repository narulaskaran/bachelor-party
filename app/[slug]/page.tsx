import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PartyView } from "@/components/party-view";
import { AUTH_COOKIE } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { DEMO_PARTY } from "@/lib/demo-party";
import { cookieAuthenticatesParty } from "@/lib/party-auth";
import type { PartyContent } from "@/lib/party-types";
import { login } from "./actions";
import { PartyLoginForm } from "./party-login-form";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

type ResolvedParty = {
  id: number | "demo";
  password: string;
  content: PartyContent;
};

export default async function Page({ params }: Params) {
  const { slug } = await params;
  const db = getDb();

  let party: ResolvedParty | null = null;

  if (db) {
    const [row] = await db
      .select({
        id: schema.parties.id,
        password: schema.parties.password,
        content: schema.parties.content,
      })
      .from(schema.parties)
      .where(eq(schema.parties.slug, slug))
      .limit(1);
    if (row) party = row;
  } else if (slug === "demo") {
    const expected = process.env.PARTY_PASSWORD;
    if (!expected) {
      // No password configured anywhere — demo is open, same as root today.
      return <PartyView content={DEMO_PARTY} />;
    }
    party = { id: "demo", password: expected, content: DEMO_PARTY };
  }

  if (!party) notFound();

  const raw = (await cookies()).get(AUTH_COOKIE)?.value;
  const authed = await cookieAuthenticatesParty(raw, party.id, party.password);

  if (!authed) {
    const loginWithSlug = login.bind(null, slug);
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-4 py-16">
        <Card className="w-full max-w-sm">
          <CardHeader className="items-center text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Private Trip
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold uppercase tracking-wide">
              Who Goes There
            </h1>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <PartyLoginForm loginAction={loginWithSlug} />
            <p className="text-center text-xs text-muted-foreground">
              Password&rsquo;s in the group chat.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <PartyView content={party.content} />;
}
