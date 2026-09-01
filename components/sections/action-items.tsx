import { Button } from "@/components/ui/button";
import { HashFocusLink } from "@/components/hash-focus-link";
import type { ActionItem } from "@/lib/party-types";
import { contentGroupClass, sectionTitleClass } from "@/lib/type";
import { cn } from "@/lib/utils";

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
    <section id="do-your-part" className="scroll-mt-20 py-10 sm:py-12">
      <h2 className={sectionTitleClass}>Do your part</h2>

      <ol className={cn("mt-8 overflow-hidden", contentGroupClass)}>
        {actionItems.map((item, index) => (
          <li key={item.title} className="flex items-start gap-4 border-b border-border p-4 last:border-b-0 sm:p-5">
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
              {item.anchor ? (
                <Button asChild size="sm" className="mt-3 min-h-11">
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
              ) : (
                <span className="mt-2 inline-flex rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">
                  Reminder
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
