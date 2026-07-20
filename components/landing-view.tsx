import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LandingView() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-5xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Trip Logistics, Handled
      </p>
      <h1 className="mt-4 font-display text-5xl font-bold uppercase tracking-wide sm:text-7xl">
        The Big Send
      </h1>
      <p className="mt-4 max-w-xl text-lg text-muted-foreground">
        A password-gated logistics site for bachelor parties and group trips.
        Each party gets its own page — schedule, lodging, activities, and an
        RSVP form — behind a shared password only your group has.
      </p>
      <p className="mt-8 text-sm text-muted-foreground">
        Got an invite link from your organizer? Use it to see your trip.
      </p>
      <footer className="mt-16 border-t border-border pt-6">
        <Button variant="link" size="sm" asChild>
          <Link
            href="https://github.com/narulaskaran/bachelor-party"
            target="_blank"
            rel="noopener noreferrer"
          >
            View on GitHub
          </Link>
        </Button>
      </footer>
    </div>
  );
}
