import type { ReactNode } from "react";
import type { PartyContent } from "@/lib/party-types";
import { visibleSections } from "@/lib/trip-sections";
import { Hero } from "@/components/sections/hero";
import { Glance } from "@/components/sections/glance";
import { ActionItems } from "@/components/sections/action-items";
import { ScheduleSection } from "@/components/sections/schedule";
import { ActivitiesSection } from "@/components/sections/activities";
import { BasecampSection } from "@/components/sections/basecamp";
import { PackingSection } from "@/components/sections/packing";
import { InitialHashFocus } from "@/components/initial-hash-focus";

export function PartyChrome({
  content,
  slug,
  rsvp,
  hashFocus = true,
  preview = false,
  sample = false,
}: {
  content: PartyContent;
  slug?: string;
  rsvp: ReactNode;
  hashFocus?: boolean;
  /** Host guest preview — pack is a static list, not a checkoff. */
  preview?: boolean;
  /** Public sample trip — clearly disclose non-persistent/demo content. */
  sample?: boolean;
}) {
  const sections = visibleSections(content);
  const footerBits = [
    content.trip.location,
    content.trip.elevation,
    content.trip.dateLabel,
  ].filter(Boolean);

  const body = (
    <div
      className="mx-auto w-full min-w-0 max-w-5xl px-4"
      data-presentation={content.presentation?.style ?? "clean"}
    >
      <Hero trip={content.trip} guestUpdate={content.guestUpdate} sample={sample} />
      {sections.glance ? (
        <Glance trip={content.trip} lodging={content.lodging} />
      ) : null}
      {sections.actionItems && content.actionItems ? (
        <ActionItems actionItems={content.actionItems} />
      ) : null}
      {sections.schedule && content.schedule ? (
        <ScheduleSection schedule={content.schedule} />
      ) : null}
      {sections.activities && content.activities ? (
        <ActivitiesSection activities={content.activities} />
      ) : null}
      {sections.lodging && content.lodging ? (
        <BasecampSection trip={content.trip} lodging={content.lodging} />
      ) : null}
      {sections.packing && content.packing ? (
        <PackingSection packing={content.packing} slug={slug ?? ""} preview={preview} />
      ) : null}
      {rsvp}

      {footerBits.length > 0 ? (
        <footer className="border-t border-border py-8 text-center">
          <p className="break-words text-sm text-muted-foreground">
            {footerBits.join(" · ")}
          </p>
        </footer>
      ) : null}
    </div>
  );

  if (!hashFocus) return body;
  return <InitialHashFocus targetId="rsvp">{body}</InitialHashFocus>;
}
