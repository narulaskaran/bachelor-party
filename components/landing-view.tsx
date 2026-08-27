"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CreateTripForm } from "@/components/create-trip-form";
import { HashFocusLink } from "@/components/hash-focus-link";
import { prefersReducedMotion } from "@/components/hash-navigation";
import {
  LANDING_PANEL_MOTION_MS,
  LandingFold,
  LandingPanelSection,
  landingPanelMotionClass,
} from "@/components/landing-panel-section";
import { TripEntryForm } from "@/components/trip-entry-form";
import { DEFAULT_INVITE_HOST } from "@/lib/invite-host";
import { landingPanelHash, panelFromHash, type LandingPanel } from "@/lib/landing-panel";
import { LEGACY_PAGE_HASHES } from "@/lib/legacy-page-redirects";
import { pageTitleClass, sectionTitleClass } from "@/lib/type";
import { cn } from "@/lib/utils";

const footerIconLinkClass =
  "inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function GitHubMark() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 496 512"
      className="size-6 fill-current"
      aria-hidden="true"
    >
      <path d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3zm44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3.7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3.3 2.9 2.3 3.9 1.6 1 3.6.7 4.3-.7.7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3.7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3.7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z" />
    </svg>
  );
}

function KofiMark() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="size-6 fill-current"
      aria-hidden="true"
    >
      <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.265-1.782 3.168-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z" />
    </svg>
  );
}

export function LandingView({
  inviteHost = DEFAULT_INVITE_HOST,
}: {
  inviteHost?: string;
}) {
  const [panel, setPanel] = useState<LandingPanel | null>(null);
  const [animate, setAnimate] = useState(false);
  const [hidePoster, setHidePoster] = useState(false);
  const panelRef = useRef<LandingPanel | null>(null);
  const animateRef = useRef(false);
  const hidePosterRef = useRef(false);
  const hideTimerRef = useRef<number>(undefined);
  const applyPanelRef = useRef<(next: LandingPanel | null) => void>(() => {});

  useLayoutEffect(() => {
    function clearHideTimer() {
      if (hideTimerRef.current === undefined) return;
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = undefined;
    }

    function applyPanel(next: LandingPanel | null) {
      const wasCompact = panelRef.current !== null;
      const nextCompact = next !== null;
      panelRef.current = next;
      setPanel(next);

      if (!nextCompact) {
        clearHideTimer();
        if (hidePosterRef.current) setHidePoster(false);
        hidePosterRef.current = false;
        return;
      }
      if (wasCompact) return;
      if (!animateRef.current) return;
      if (prefersReducedMotion()) {
        clearHideTimer();
        hidePosterRef.current = true;
        setHidePoster(true);
        return;
      }
      hidePosterRef.current = false;
      setHidePoster(false);
      clearHideTimer();
      hideTimerRef.current = window.setTimeout(() => {
        hidePosterRef.current = true;
        setHidePoster(true);
        hideTimerRef.current = undefined;
      }, LANDING_PANEL_MOTION_MS);
    }

    applyPanelRef.current = applyPanel;
    applyPanel(panelFromHash(window.location.hash));
    const motion = requestAnimationFrame(() => {
      animateRef.current = true;
      setAnimate(true);
      if (panelRef.current !== null) {
        clearHideTimer();
        hidePosterRef.current = true;
        setHidePoster(true);
      }
    });
    const sync = () => applyPanelRef.current(panelFromHash(window.location.hash));
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      cancelAnimationFrame(motion);
      clearHideTimer();
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  function reveal(next: LandingPanel) {
    flushSync(() => applyPanelRef.current(next));
  }

  const compact = panel !== null;
  const posterHidden = compact && (!animate || hidePoster);

  return (
    <div
      data-landing-page=""
      className="mx-auto flex min-h-[calc(100svh-3.75rem)] max-w-3xl flex-col px-6"
    >
      <section
        className={cn(
          "flex flex-col items-center text-center",
          compact ? "py-4 sm:py-5" : "py-16 sm:py-24",
          animate && cn("transition-[padding]", landingPanelMotionClass),
        )}
      >
        <LandingFold
          data-landing-poster=""
          open={!compact}
          animate={animate}
          closedTranslateClass="-translate-y-2"
          className="w-full"
          innerClassName="mb-10 text-center"
          aria-hidden={compact || undefined}
          inert={compact || undefined}
        >
          <h1 className={pageTitleClass} hidden={posterHidden}>
            The Big <span className="text-primary">Send</span>
          </h1>
          <p
            hidden={posterHidden}
            className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base"
          >
            Paste a messy plan. Review it on the site. Send a private guest page.
          </p>
        </LandingFold>

        <div className="flex w-full max-w-md flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
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

      <footer className="mt-auto py-8">
        <div className="flex items-center justify-center gap-1">
          <Link
            href="https://github.com/narulaskaran/bachelor-party"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className={footerIconLinkClass}
          >
            <GitHubMark />
          </Link>
          <Link
            href="https://ko-fi.com/Y8Y21CC8IA"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Ko-fi"
            className={footerIconLinkClass}
          >
            <KofiMark />
          </Link>
        </div>
      </footer>
    </div>
  );
}
