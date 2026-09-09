import { loadPublicRsvp } from "@/lib/rsvp-roster";
import type { Activity, RsvpConfig } from "@/lib/party-types";
import { RsvpSectionView } from "@/components/sections/rsvp-view";

export async function RsvpSection({
  pollActivities,
  airport,
  rsvpConfig = {},
  sample = false,
  preview = false,
  inviteToken,
  heading,
  description,
  extras = { flights: Boolean(airport), food: false, votes: pollActivities.length > 0, notes: false },
}: {
  pollActivities: Activity[];
  airport?: string;
  rsvpConfig?: RsvpConfig;
  sample?: boolean;
  preview?: boolean;
  inviteToken?: string;
  heading?: string;
  description?: string;
  extras?: { flights: boolean; food: boolean; votes: boolean; notes: boolean };
}) {
  const skipGuestCookie = sample || preview;
  const { guests, prefill } = skipGuestCookie
    ? { guests: [], prefill: null }
    : await loadPublicRsvp(inviteToken);

  return (
    <RsvpSectionView
      pollActivities={pollActivities}
      airport={airport}
      rsvpConfig={rsvpConfig}
      sample={sample}
      preview={preview}
      inviteToken={inviteToken}
      heading={heading}
      description={description}
      extras={extras}
      guests={guests}
      prefill={prefill}
    />
  );
}
