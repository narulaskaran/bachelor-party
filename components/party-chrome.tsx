import { memo, type ReactNode } from "react";
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

const MemoHero = memo(Hero);
const MemoGlance = memo(Glance);
const MemoActionItems = memo(ActionItems);
const MemoScheduleSection = memo(ScheduleSection);
const MemoActivitiesSection = memo(ActivitiesSection);
const MemoBasecampSection = memo(BasecampSection);
const MemoPackingSection = memo(PackingSection);

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
      <MemoHero trip={content.trip} guestUpdate={content.guestUpdate} sample={sample} />
      {sections.glance ? (
        <MemoGlance trip={content.trip} lodging={content.lodging} />
      ) : null}
      {sections.actionItems && content.actionItems ? (
        <MemoActionItems actionItems={content.actionItems} />
      ) : null}
      {sections.schedule && content.schedule ? (
        <MemoScheduleSection schedule={content.schedule} />
      ) : null}
      {sections.activities && content.activities ? (
        <MemoActivitiesSection activities={content.activities} />
      ) : null}
      {sections.lodging && content.lodging ? (
        <MemoBasecampSection trip={content.trip} lodging={content.lodging} />
      ) : null}
      {sections.packing && content.packing ? (
        <MemoPackingSection packing={content.packing} slug={slug ?? ""} preview={preview} />
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
