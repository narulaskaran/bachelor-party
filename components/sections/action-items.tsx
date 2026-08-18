import { Button } from "@/components/ui/button";
import { HashFocusLink } from "@/components/hash-focus-link";
import type { ActionItem } from "@/lib/party-types";
import { sectionTitleClass } from "@/lib/type";

const ANCHOR_LABELS: Record<string, string> = {
  rsvp: "RSVP",
  schedule: "Schedule",
  activities: "Activities",
  lodge: "Lodge",
  basecamp: "Lodge",
  pack: "Pack",
  glance: "At a glance",
  "do-your-part": "Do your part",
};

/** Button copy for an action-item in-page target. */
export function actionItemCtaLabel(anchor: string): string {
  const id = anchor.replace(/^#/, "").split(/[/?]/)[0] ?? "";
  return ANCHOR_LABELS[id] ?? "Open";
}

export function ActionItems({ actionItems }: { actionItems: ActionItem[] }) {
  return (
    <section id="do-your-part" className="scroll-mt-20 py-12 sm:py-16">
      <h2 className={sectionTitleClass}>Do your part</h2>

      <ol className="mt-8 flex flex-col gap-6">
        {actionItems.map((item, index) => (
          <li key={item.title} className="flex items-start gap-4">
            <span
              aria-hidden="true"
              className="text-3xl font-semibold leading-none text-primary"
            >
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{item.title}</p>
              {item.note && (
                <p className="mt-1 text-sm text-muted-foreground">{item.note}</p>
              )}
              {item.anchor && (
                <Button asChild size="sm" className="mt-3">
                  {item.anchor.startsWith("#") ? (
                    <HashFocusLink
                      href={item.anchor as `#${string}`}
                      focusId={item.anchor.slice(1).split(/[/?]/)[0] ?? ""}
                    >
                      {actionItemCtaLabel(item.anchor)}
                    </HashFocusLink>
                  ) : (
                    <a href={item.anchor}>{actionItemCtaLabel(item.anchor)}</a>
                  )}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
