"use client";

import type { PartyContent } from "@/lib/party-types";
import { pollActivities } from "@/lib/party-types";
import { guestRsvpExtras } from "@/lib/trip-sections";
import { PartyChrome } from "@/components/party-chrome";
import { RsvpSectionView } from "@/components/sections/rsvp-view";

export function HostPartyPreview({
  content,
  sample = false,
  slug,
}: {
  content: PartyContent;
  sample?: boolean;
  slug?: string;
}) {
  const extras = guestRsvpExtras(content);

  return (
    <PartyChrome
      content={content}
      slug={slug}
      hashFocus={false}
      preview
      rsvp={
        <RsvpSectionView
          sample={sample}
          preview
          pollActivities={pollActivities(content)}
          airport={extras.flights ? content.trip.airport : undefined}
          heading={content.rsvp?.heading}
          description={content.rsvp?.description}
          rsvpConfig={content.rsvp}
          extras={extras}
          guests={[]}
          prefill={null}
        />
      }
    />
  );
}
