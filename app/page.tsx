import { redirect } from "next/navigation";
import { getCurrentParty } from "@/lib/current-party";
import { pollActivities } from "@/lib/party-types";
import { Hero } from "@/components/sections/hero";
import { Glance } from "@/components/sections/glance";
import { ActionItems } from "@/components/sections/action-items";
import { ScheduleSection } from "@/components/sections/schedule";
import { ActivitiesSection } from "@/components/sections/activities";
import { BasecampSection } from "@/components/sections/basecamp";
import { RsvpSection } from "@/components/sections/rsvp";

export const dynamic = "force-dynamic";

export default async function Page() {
  const current = await getCurrentParty();
  if (!current) redirect("/login");
  const { content } = current;

  return (
    <div className="mx-auto max-w-5xl px-4">
      <Hero trip={content.trip} />
      <Glance trip={content.trip} lodging={content.lodging} />
      <ActionItems actionItems={content.actionItems} />
      <ScheduleSection schedule={content.schedule} />
      <ActivitiesSection activities={content.activities} />
      <BasecampSection trip={content.trip} lodging={content.lodging} />
      <RsvpSection
        pollActivities={pollActivities(content)}
        airport={content.trip.airport}
      />

      <footer className="border-t border-border py-8 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {content.trip.location} · {content.trip.elevation} · {content.trip.dateLabel}
        </p>
      </footer>
    </div>
  );
}
