"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  isHostKeyBannerHidden,
  readStoredHostKey,
  setHostKeyBannerHidden,
  subscribeHostKeyStore,
} from "@/lib/host-key-storage";

export function HostKeyBanner({ slug }: { slug: string }) {
  const stored = useSyncExternalStore(
    subscribeHostKeyStore,
    () => readStoredHostKey(slug) ?? null,
    () => null,
  );
  const hidden = useSyncExternalStore(
    subscribeHostKeyStore,
    () => isHostKeyBannerHidden(slug),
    () => true,
  );
  const [copied, setCopied] = useState(false);
  if (!stored) return null;
  const hostKey = stored;

  async function copy() {
    try {
      await navigator.clipboard.writeText(hostKey);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (hidden) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="ghost" onClick={() => setHostKeyBannerHidden(slug, false)}>
          Show host key
        </Button>
      </div>
    );
  }

  return (
    <aside className="rounded-lg border border-border bg-muted/30 p-4" aria-label="Host key">
      <p className="text-sm font-medium">Bookmark this organizer page. Your host key:</p>
      <p className="mt-2 break-all font-mono text-sm">{hostKey}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        Keep this to yourself. It is not the guest link. Hide it here; you can show it again in this tab.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy host key"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setHostKeyBannerHidden(slug, true)}>
          Hide
        </Button>
      </div>
    </aside>
  );
}
