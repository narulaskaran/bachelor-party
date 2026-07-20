import { getCurrentParty } from "@/lib/current-party";
import { PartyView } from "@/components/party-view";

export const dynamic = "force-dynamic";

export default async function Page() {
  const current = await getCurrentParty();
  if (!current) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-5xl items-center justify-center px-4 text-center">
        <p className="text-muted-foreground">
          Use your party&rsquo;s link to view your trip.
        </p>
      </div>
    );
  }

  return <PartyView content={current.content} />;
}
