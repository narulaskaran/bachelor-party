"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { hostKeyStorageKey } from "@/components/create-trip-form";

function subscribe() {
  return () => {};
}

export function HostKeyBanner({ slug }: { slug: string }) {
  const stored = useSyncExternalStore(
    subscribe,
    () => sessionStorage.getItem(hostKeyStorageKey(slug)),
    () => null,
  );
  const [dismissed, setDismissed] = useState(false);
  if (!stored || dismissed) return null;

  function dismiss() {
    sessionStorage.removeItem(hostKeyStorageKey(slug));
    setDismissed(true);
  }

  return (
    <aside className="rounded-lg border border-border bg-muted/30 p-4" aria-label="Host key">
      <p className="text-sm font-medium">Bookmark this organizer page. Your host key:</p>
      <p className="mt-2 break-all font-mono text-sm">{stored}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        Keep this to yourself. It is not the guest link, and we won&apos;t show it again here.
      </p>
      <Button
        type="button"
        variant="outline"
        className="mt-3"
        onClick={() => {
          navigator.clipboard.writeText(stored);
          dismiss();
        }}
      >
        Copy host key
      </Button>
    </aside>
  );
}
