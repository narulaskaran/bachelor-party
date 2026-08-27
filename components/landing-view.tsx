"use client";

import { useLayoutEffect, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CreateTripForm } from "@/components/create-trip-form";
import { HashFocusLink } from "@/components/hash-focus-link";
import { LandingPanelSection } from "@/components/landing-panel-section";
import { TripEntryForm } from "@/components/trip-entry-form";
import { DEFAULT_INVITE_HOST } from "@/lib/invite-host";
import { landingPanelHash, panelFromHash, type LandingPanel } from "@/lib/landing-panel";
import { LEGACY_PAGE_HASHES } from "@/lib/legacy-page-redirects";
import { pageTitleClass, quietLinkClass, sectionTitleClass } from "@/lib/type";
import { cn } from "@/lib/utils";

export function LandingView({
  inviteHost = DEFAULT_INVITE_HOST,
}: {
  inviteHost?: string;
}) {
  const [panel, setPanel] = useState<LandingPanel | null>(null);
  const [animate, setAnimate] = useState(false);

  useLayoutEffect(() => {
    const sync = () => setPanel(panelFromHash(window.location.hash));
    sync();
    const motion = requestAnimationFrame(() => setAnimate(true));
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      cancelAnimationFrame(motion);
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  function reveal(next: LandingPanel) {
    flushSync(() => setPanel(next));
  }

  const compact = panel !== null;

  return (
    <div
      data-landing-page=""
      className="mx-auto flex min-h-[calc(100svh-3.75rem)] max-w-3xl flex-col px-6"
    >
      <section
        className={cn(
          "flex flex-col items-center text-center",
          compact ? "py-4 sm:py-5" : "py-16 sm:py-24",
        )}
      >
        <h1 className={cn(pageTitleClass, compact && "hidden")}>
          The Big <span className="text-primary">Send</span>
        </h1>
        <p
          className={cn(
            "mt-4 max-w-xl text-sm text-muted-foreground sm:text-base",
            compact && "hidden",
          )}
        >
          Paste a messy plan. Review it on the site. Send a private guest page.
        </p>

        <div
          className={cn(
            "flex w-full max-w-md flex-col items-stretch gap-3 sm:flex-row sm:justify-center",
            compact ? "mt-0" : "mt-10",
          )}
        >
          <Button asChild variant={panel === null || panel === "enter" ? "outline" : "default"}>
            <HashFocusLink
              href={landingPanelHash("create")}
              focusId={["plan", "create-trip-heading"]}
              aria-expanded={panel === "create"}
              aria-controls="create"
              onClick={() => reveal("create")}
            >
              I&apos;m hosting
            </HashFocusLink>
          </Button>
          <Button asChild variant={panel === null || panel === "create" ? "outline" : "default"}>
            <HashFocusLink
              href={landingPanelHash("enter")}
              focusId={["trip-slug", "trip-entry-heading"]}
              aria-expanded={panel === "enter"}
              aria-controls="enter"
              onClick={() => reveal("enter")}
            >
              I have an invite
            </HashFocusLink>
          </Button>
        </div>
      </section>

      <div className="grid">
        <LandingPanelSection
          id="create"
          open={panel === "create"}
          animate={animate}
          labelledBy="create-trip-heading"
        >
          <CreateTripForm />
        </LandingPanelSection>

        <LandingPanelSection
          id="enter"
          open={panel === "enter"}
          animate={animate}
          labelledBy="trip-entry-heading"
        >
          {LEGACY_PAGE_HASHES.map((hash) => (
            <div key={hash} id={hash} className="scroll-mt-20" aria-hidden="true" />
          ))}
          <h2 id="trip-entry-heading" tabIndex={-1} className={sectionTitleClass}>
            Enter your trip
          </h2>
          <p id="trip-entry-hint" className="mt-2 max-w-xl text-sm text-muted-foreground">
            Invite links look like{" "}
            <span className="whitespace-nowrap font-mono text-foreground">
              {inviteHost}/g/…
            </span>
            . Paste that URL. Older events may still use a trip name and password.
          </p>
          <TripEntryForm />
        </LandingPanelSection>
      </div>

      <footer className="mt-auto py-8 text-center text-xs text-muted-foreground">
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
