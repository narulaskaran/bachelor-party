import { headers } from "next/headers";
import { LandingView } from "@/components/landing-view";
import { inviteHostFromHeaders } from "@/lib/invite-host";

// Public marketing page. A valid bp_access cookie must not render the
// private trip here — that content lives only at /{slug}.
export default async function Page() {
  const headerList = await headers();
  return <LandingView inviteHost={inviteHostFromHeaders(headerList)} />;
}
