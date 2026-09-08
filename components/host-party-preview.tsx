"use client";

import { memo, useMemo } from "react";
import type { PartyContent } from "@/lib/party-types";
import { pollActivities } from "@/lib/party-types";
import { guestRsvpExtras } from "@/lib/trip-sections";
import { PartyChrome } from "@/components/party-chrome";
import { RsvpSectionView } from "@/components/sections/rsvp-view";

const EMPTY_PREVIEW_GUESTS: [] = [];
const MemoRsvpSectionView = memo(RsvpSectionView);

export const HostPartyPreview = memo(function HostPartyPreview({
  content,
  sample = false,
  slug,
}: {
  content: PartyContent;
  sample?: boolean;
  slug?: string;
}) {
  /* eslint-disable react-hooks/exhaustive-deps -- keyed off dirty RSVP slices, not the whole draft object */
  const extras = useMemo(
    () => guestRsvpExtras(content),
    [content.preset, content.trip.airport, content.activities],
  );
  const polls = useMemo(() => pollActivities(content), [content.activities]);
  /* eslint-enable react-hooks/exhaustive-deps */
  const rsvp = (
    <MemoRsvpSectionView
      sample={sample}
      preview
      pollActivities={polls}
      airport={extras.flights ? content.trip.airport : undefined}
      heading={content.rsvp?.heading}
      description={content.rsvp?.description}
      rsvpConfig={content.rsvp}
      extras={extras}
      guests={EMPTY_PREVIEW_GUESTS}
      prefill={null}
    />
  );

  return (
    <PartyChrome
      content={content}
      slug={slug}
      hashFocus={false}
      preview
      rsvp={rsvp}
    />
  );
});
