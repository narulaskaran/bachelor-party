"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { OrganizerPacket } from "@/lib/create-trip";

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
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
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

export function OrganizerPacketView({ packet }: { packet: OrganizerPacket }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Organizer packet
        </p>
        <h2 className="mt-2 font-display text-3xl font-bold uppercase tracking-wide">
          Trip created
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Save these now — especially the admin token. It&rsquo;s the only way
          to edit this trip later, and we won&rsquo;t show it again.
        </p>
      </div>

      <Alert>
        <AlertTitle>Keep this page until you&rsquo;ve copied everything</AlertTitle>
        <AlertDescription>
          Share the invite URL and guest password with your crew. Keep the admin
          token to yourself.
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
          label="Admin token"
          value={packet.adminToken}
          hint="Authorizes edits for this trip only. Not a site-wide secret."
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href={`/${packet.slug}`}>Open the trip</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/create">Create another</Link>
        </Button>
      </div>
    </div>
  );
}
