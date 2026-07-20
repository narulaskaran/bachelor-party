import { getCurrentParty } from "@/lib/current-party";
import { PartyView } from "@/components/party-view";
import { LandingView } from "@/components/landing-view";

export const dynamic = "force-dynamic";

export default async function Page() {
  const current = await getCurrentParty();
  if (!current) {
    return <LandingView />;
  }

  return <PartyView content={current.content} />;
}
