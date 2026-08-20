"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { OrganizerPacket } from "@/lib/create-trip";
import { openAsGuest } from "@/lib/guest-access";
import { openAsHost } from "@/lib/host-access";
import { groupInviteText } from "@/lib/organizer-packet";
import { kickerClass, sectionTitleClass } from "@/lib/type";

function CopyField({
  label,
  value,
  hint,
  mono = true,
}: {
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <p className={kickerClass}>{label}</p>
      <div className="flex items-start gap-2">
        <p
          className={`min-w-0 flex-1 break-all rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm ${
            mono ? "font-mono" : ""
          }`}
        >
          {value}
        </p>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Copy ${label}`}
          onClick={copy}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function CopyGroupButton({ packet }: { packet: OrganizerPacket }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(groupInviteText(packet));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={copy}>
      {copied ? "Copied" : "Text these to the group"}
    </Button>
  );
}

export function OrganizerPacketView({
  packet,
  onCreateAnother,
  openTrip = openAsGuest,
  openHost = openAsHost,
}: {
  packet: OrganizerPacket;
  onCreateAnother?: () => void;
  openTrip?: (slug: string, password: string) => Promise<unknown>;
  openHost?: (slug: string, adminToken: string) => Promise<unknown>;
}) {
  async function openGuestTrip() {
    await openTrip(packet.slug, packet.password);
  }

  async function openHostTools() {
    await openHost(packet.slug, packet.adminToken);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 id="create-trip-heading" tabIndex={-1} className={sectionTitleClass}>
          Event created
        </h2>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Your private draft is ready. Review the extracted facts, fill in what
          you know, preview the guest page, then publish. Copy the invite now;
          the host key will not be shown again.
        </p>
      </div>

      <Alert>
        <AlertTitle>The host key will not be shown again</AlertTitle>
        <AlertDescription>
          Text the invite URL and guest password to the group. Keep the host key
          to yourself — we cannot display it after you leave this page.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <CopyField
          label="Invite URL"
          value={packet.url}
          hint="Guests open this link and enter the password."
          mono={false}
        />
        <CopyField
          label="Guest password"
          value={packet.password}
          hint="The shared password for the trip site."
        />
        <CopyField
          label="Host key"
          value={packet.adminToken}
          hint="Keep this to yourself. Open host tools to edit and publish. We can't show it again."
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <CopyGroupButton packet={packet} />
        <form action={openGuestTrip}>
          <Button type="submit">Open as guest</Button>
        </form>
        <form action={openHostTools}>
          <Button type="submit" variant="outline">
            Review and publish draft (pick key events)
          </Button>
        </form>
        {onCreateAnother ? (
          <Button type="button" variant="outline" onClick={onCreateAnother}>
            Create another
          </Button>
        ) : null}
      </div>
    </div>
  );
}
