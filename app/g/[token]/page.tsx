import { notFound } from "next/navigation";
import { PartyView } from "@/components/party-view";
import { UnpublishedEventView } from "@/components/unpublished-event-view";
import { resolvePartyByGuestToken } from "@/lib/resolve-party";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

export default async function GuestInvitePage({ params }: Params) {
  const { token } = await params;
  const resolved = await resolvePartyByGuestToken(token.toLowerCase());
  if (resolved.status === "missing") notFound();
  if (resolved.status === "unpublished") return <UnpublishedEventView />;
  return <PartyView content={resolved.content} slug={resolved.slug} inviteToken={resolved.guestToken} />;
}
