import Link from "next/link";
import { Button } from "@/components/ui/button";

export function TripNotFound() {
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
          The Big Send
        </p>
        <h1 className="mt-4 font-display text-5xl font-bold uppercase tracking-wide sm:text-7xl">
          No trip at this link
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          That URL doesn&rsquo;t match a trip. Check the invite from your
          organizer, or head home.
        </p>

        <div className="mt-8">
          <Button asChild>
            <Link href="/">Back home</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
