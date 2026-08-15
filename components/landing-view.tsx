import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CreateTripForm } from "@/components/create-trip-form";
import { TripEntryForm } from "@/components/trip-entry-form";
import { DEFAULT_INVITE_HOST } from "@/lib/invite-host";
import { LEGACY_PAGE_HASHES } from "@/lib/legacy-page-redirects";
import { pageTitleClass, quietLinkClass, sectionTitleClass } from "@/lib/type";

export function LandingView({
  inviteHost = DEFAULT_INVITE_HOST,
}: {
  inviteHost?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl px-6">
      <section className="flex flex-col items-center py-16 text-center sm:py-24">
        <h1 className={pageTitleClass}>The Big Send</h1>
        <p className="mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
          A password-gated logistics site for group trips — schedule, lodging,
          activities, and RSVPs, all behind one link only your crew has.
        </p>

        <div className="mt-10">
          <Button asChild>
            <a href="#create">Create a trip</a>
          </Button>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          <a href="#rsvp" className={quietLinkClass}>
            Enter your trip
          </a>
          <span aria-hidden="true"> · </span>
          <Link href="/demo" className={quietLinkClass}>
            Try a sample
          </Link>
        </p>
      </section>

      <section
        id="create"
        className="scroll-mt-20 py-10 sm:py-12"
        aria-labelledby="create-trip-heading"
      >
        <CreateTripForm />
      </section>

      <section className="py-10 sm:py-12" aria-labelledby="trip-entry-heading">
        {LEGACY_PAGE_HASHES.map((hash) => (
          <div key={hash} id={hash} className="scroll-mt-20" aria-hidden="true" />
        ))}
        <h2 id="trip-entry-heading" className={sectionTitleClass}>
          Enter your trip
        </h2>
        <p id="trip-entry-hint" className="mt-2 max-w-xl text-sm text-muted-foreground">
          Invite links look like{" "}
          <span className="inline-block whitespace-nowrap break-normal font-mono text-foreground">
            {inviteHost}/your-trip
          </span>
          . Paste that URL or just the trip code, then enter the password on the
          next page.
        </p>
        <TripEntryForm />
      </section>

      <footer className="py-8 text-center text-xs text-muted-foreground">
        <Link
          href="https://github.com/narulaskaran/bachelor-party"
          target="_blank"
          rel="noopener noreferrer"
          className={quietLinkClass}
        >
          View on GitHub
        </Link>
      </footer>
    </div>
  );
}
