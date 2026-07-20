import Link from "next/link";
import { Button } from "@/components/ui/button";

// lucide-react doesn't ship brand icons — a minimal octocat mark instead.
function GithubMark(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55 0-.27-.01-1-.02-1.96-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.75 2.69 1.25 3.34.96.1-.74.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.29 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.8 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .3.2.66.79.55A11.5 11.5 0 0 0 23.5 12c0-6.27-5.23-11.5-11.5-11.5Z" />
    </svg>
  );
}

const facts = [
  {
    label: "Access",
    value: "One Password",
    note: "No accounts, no signup — just a link",
  },
  {
    label: "Coverage",
    value: "Every Trip Detail",
    note: "Schedule, lodging, activities, RSVP",
  },
  {
    label: "Built For",
    value: "Any Crew",
    note: "Bachelor parties, ski trips, reunions",
  },
];

export function LandingView() {
  return (
    <div className="mx-auto max-w-5xl px-4">
      <section className="relative overflow-hidden py-10 sm:py-16">
        <svg
          aria-hidden="true"
          viewBox="0 0 400 400"
          fill="none"
          className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 text-primary/[0.08] sm:-top-32 sm:-right-16 sm:h-[28rem] sm:w-[28rem]"
        >
          {[50, 90, 130, 170, 210].map((r) => (
            <circle key={r} cx="200" cy="200" r={r} stroke="currentColor" strokeWidth="1" />
          ))}
        </svg>

        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Trip Logistics, Handled
        </p>
        <h1 className="mt-4 font-display text-5xl font-bold uppercase tracking-wide sm:text-7xl">
          The Big Send
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          A password-gated logistics site for bachelor parties and group
          trips — schedule, lodging, activities, and RSVPs, all behind one
          link only your crew has.
        </p>

        <div className="mt-8 grid grid-cols-1 divide-y divide-border border-t border-b border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {facts.map((fact) => (
            <div key={fact.label} className="py-5 sm:px-6 sm:py-6 sm:first:pl-0">
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {fact.label}
              </p>
              <p className="mt-1 font-display text-lg font-bold uppercase tracking-wide sm:text-xl">
                {fact.value}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{fact.note}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          Got an invite link from your organizer? Use it to see your trip.
        </p>
      </section>

      <footer className="border-t border-border py-8">
        <Button variant="outline" size="sm" asChild>
          <Link
            href="https://github.com/narulaskaran/bachelor-party"
            target="_blank"
            rel="noopener noreferrer"
          >
            <GithubMark className="size-4" />
            View on GitHub
          </Link>
        </Button>
      </footer>
    </div>
  );
}
