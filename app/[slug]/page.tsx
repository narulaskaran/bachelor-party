import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PartyView } from "@/components/party-view";
import { AUTH_COOKIE } from "@/lib/auth";
import { cookieAuthenticatesParty } from "@/lib/party-auth";
import { resolvePartyBySlug } from "@/lib/resolve-party";
import { login } from "./actions";
import { PartyLoginForm } from "./party-login-form";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export default async function Page({ params }: Params) {
  const { slug } = await params;
  const resolved = await resolvePartyBySlug(slug);

  // Fallback if proxy didn't rewrite this slug to /_not-found first.
  if (resolved.status === "missing") notFound();

  if (resolved.status === "open") {
    return <PartyView content={resolved.content} sample />;
  }

  const raw = (await cookies()).get(AUTH_COOKIE)?.value;
  const authed = await cookieAuthenticatesParty(raw, resolved.id, resolved.password);

  if (!authed) {
    const loginWithSlug = login.bind(null, slug);
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-4 py-16">
        <Card className="w-full max-w-sm">
          <CardHeader className="items-center text-center">
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Who goes there</h1>
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

  return <PartyView content={resolved.content} />;
}
