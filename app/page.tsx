import { LandingView } from "@/components/landing-view";

// Public marketing page. A valid bp_access cookie must not render the
// private trip here — that content lives only at /{slug}.
export default function Page() {
  return <LandingView />;
}
