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
          One private page for the trip — schedule, cabin, and who&apos;s coming.
        </p>

        <div className="mt-10 flex w-full max-w-md flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          <Button asChild>
            <a href="#create">I&apos;m hosting</a>
          </Button>
          <Button asChild>
            <a href="#enter">I have an invite</a>
          </Button>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
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

      <section
        id="enter"
        className="scroll-mt-20 py-10 sm:py-12"
        aria-labelledby="trip-entry-heading"
      >
        {LEGACY_PAGE_HASHES.map((hash) => (
          <div key={hash} id={hash} className="scroll-mt-20" aria-hidden="true" />
        ))}
        <h2 id="trip-entry-heading" className={sectionTitleClass}>
          Enter your trip
        </h2>
        <p id="trip-entry-hint" className="mt-2 max-w-xl text-sm text-muted-foreground">
          Invite links look like{" "}
          <span className="font-mono text-foreground">
            <span className="whitespace-nowrap">{inviteHost}</span>
            <wbr />
            /your-trip
          </span>
          . Paste that URL or just the trip name, then enter the password on the
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
