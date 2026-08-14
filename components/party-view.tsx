import type { PartyContent } from "@/lib/party-types";
import { pollActivities } from "@/lib/party-types";
import {
  heroMeta,
  showFlightFields,
  visibleSections,
} from "@/lib/trip-sections";
import { Hero } from "@/components/sections/hero";
import { Glance } from "@/components/sections/glance";
import { ActionItems } from "@/components/sections/action-items";
import { ScheduleSection } from "@/components/sections/schedule";
import { ActivitiesSection } from "@/components/sections/activities";
import { BasecampSection } from "@/components/sections/basecamp";
import { RsvpSection } from "@/components/sections/rsvp";

export function PartyView({
  content,
  sample = false,
}: {
  content: PartyContent;
  /** Public /demo fixture — RSVP must not read or write a real trip. */
  sample?: boolean;
}) {
  const sections = visibleSections(content);
  const footerBits = [
    content.trip.location,
    content.trip.elevation,
    content.trip.dateLabel,
  ].filter(Boolean);

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl px-4">
      <Hero trip={content.trip} meta={heroMeta(content.trip)} />
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
      <RsvpSection
        sample={sample}
        pollActivities={pollActivities(content)}
        airport={showFlightFields(content) ? content.trip.airport : undefined}
      />

      {footerBits.length > 0 ? (
        <footer className="border-t border-border py-8 text-center">
          <p className="break-words font-mono text-xs uppercase tracking-widest text-muted-foreground">
            {footerBits.join(" · ")}
          </p>
        </footer>
      ) : null}
    </div>
  );
}
