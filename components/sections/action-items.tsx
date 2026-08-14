import { Button } from "@/components/ui/button";
import type { ActionItem } from "@/lib/party-types";
import { sectionTitleClass } from "@/lib/type";

export function ActionItems({ actionItems }: { actionItems: ActionItem[] }) {
  return (
    <section className="py-12 sm:py-16">
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
