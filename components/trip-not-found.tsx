import Link from "next/link";
import { Button } from "@/components/ui/button";
import { pageTitleClass } from "@/lib/type";

export function TripNotFound() {
  return (
    <div className="mx-auto max-w-3xl px-6">
      <section className="flex flex-col items-center py-16 text-center sm:py-24">
        <p className="mb-3 text-sm text-muted-foreground">The Big Send</p>
        <h1 className={pageTitleClass}>No trip at this link</h1>
        <p className="mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
          That URL doesn&rsquo;t match a trip. Check the invite from your
          organizer, or head home.
        </p>

        <div className="mt-10">
          <Button asChild>
            <Link href="/">Back home</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
