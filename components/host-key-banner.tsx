"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { readStoredHostKey, subscribeHostKeyStore } from "@/lib/host-key-storage";

export function HostKeyBanner({ slug }: { slug: string }) {
  const stored = useSyncExternalStore(
    subscribeHostKeyStore,
    () => readStoredHostKey(slug) ?? null,
    () => null,
  );
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!stored || dismissed) return null;
  const hostKey = stored;

  async function copy() {
    try {
      await navigator.clipboard.writeText(hostKey);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <aside className="rounded-lg border border-border bg-muted/30 p-4" aria-label="Host key">
      <p className="text-sm font-medium">Bookmark this organizer page. Your host key:</p>
      <p className="mt-2 break-all font-mono text-sm">{hostKey}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        Keep this to yourself. It is not the guest link, and we won&apos;t show it again here.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy host key"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setDismissed(true)}>
          Hide
        </Button>
      </div>
    </aside>
  );
}
