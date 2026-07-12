import { Button } from "@/components/ui/button";
import type { ActionItem } from "@/lib/party-types";

export function ActionItems({ actionItems }: { actionItems: ActionItem[] }) {
  return (
    <section className="border-t border-border py-12 sm:py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Before the Trip
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
        Do Your Part
      </h2>

      <ol className="mt-8 flex flex-col gap-6">
        {actionItems.map((item, index) => (
          <li key={item.title} className="flex items-start gap-4">
            <span
              aria-hidden="true"
              className="font-display text-3xl font-bold leading-none text-primary"
            >
              {index + 1}
            </span>
            <div className="flex-1">
              <p className="font-medium">{item.title}</p>
              {item.note && (
                <p className="mt-1 text-sm text-muted-foreground">{item.note}</p>
              )}
              {item.anchor && (
                <Button asChild size="sm" className="mt-3">
                  <a href={item.anchor}>Go to your info</a>
                </Button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
