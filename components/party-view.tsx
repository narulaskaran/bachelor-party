import type { PartyContent } from "@/lib/party-types";
import { pollActivities } from "@/lib/party-types";
import { guestRsvpExtras } from "@/lib/trip-sections";
import { RsvpSection } from "@/components/sections/rsvp";
import { PartyChrome } from "@/components/party-chrome";

export function PartyView({
  content,
  sample = false,
  preview = false,
  slug,
  inviteToken,
}: {
  content: PartyContent;
  /** Public /demo fixture — RSVP must not read or write a real trip. */
  sample?: boolean;
  /** Host guest preview — same guest chrome, no cookie reads/writes. */
  preview?: boolean;
  slug?: string;
  /** Published `/g/{token}` identity. Never log it. */
  inviteToken?: string;
}) {
  const extras = guestRsvpExtras(content);

  return (
    <PartyChrome
      content={content}
      slug={slug}
      preview={preview}
      sample={sample}
      rsvp={
        <RsvpSection
          sample={sample}
          preview={preview}
          inviteToken={preview || sample ? undefined : inviteToken}
          pollActivities={pollActivities(content)}
          airport={extras.flights ? content.trip.airport : undefined}
          heading={content.rsvp?.heading}
          description={content.rsvp?.description}
          rsvpConfig={content.rsvp}
          extras={extras}
        />
      }
    />
  );
}
