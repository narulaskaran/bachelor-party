import type { PartyContent } from "@/lib/party-types";
import { pollActivities } from "@/lib/party-types";
import {
  guestRsvpExtras,
  visibleSections,
} from "@/lib/trip-sections";
import { Hero } from "@/components/sections/hero";
import { Glance } from "@/components/sections/glance";
import { ActionItems } from "@/components/sections/action-items";
import { ScheduleSection } from "@/components/sections/schedule";
import { ActivitiesSection } from "@/components/sections/activities";
import { BasecampSection } from "@/components/sections/basecamp";
import { PackingSection } from "@/components/sections/packing";
import { RsvpSection } from "@/components/sections/rsvp";
import { InitialHashFocus } from "@/components/initial-hash-focus";

export function PartyView({
  content,
  sample = false,
  slug,
}: {
  content: PartyContent;
  /** Public /demo fixture — RSVP must not read or write a real trip. */
  sample?: boolean;
  slug?: string;
}) {
  const sections = visibleSections(content);
  const extras = guestRsvpExtras(content);
  const footerBits = [
    content.trip.location,
    content.trip.elevation,
    content.trip.dateLabel,
  ].filter(Boolean);

  return (
    <InitialHashFocus targetId="rsvp">
      <div
        className="mx-auto w-full min-w-0 max-w-5xl px-4"
        data-presentation={content.presentation?.style ?? "clean"}
      >
        <Hero trip={content.trip} guestUpdate={content.guestUpdate} />
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
          <PackingSection packing={content.packing} slug={slug ?? ""} />
        ) : null}
        <RsvpSection
          sample={sample}
          pollActivities={pollActivities(content)}
          airport={extras.flights ? content.trip.airport : undefined}
          heading={content.rsvp?.heading}
          description={content.rsvp?.description}
          rsvpConfig={content.rsvp}
          extras={extras}
        />

        {footerBits.length > 0 ? (
          <footer className="border-t border-border py-8 text-center">
            <p className="break-words text-xs text-muted-foreground">
              {footerBits.join(" · ")}
            </p>
          </footer>
        ) : null}
      </div>
    </InitialHashFocus>
  );
}
