"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HostEditor, type HostEditorAction } from "@/components/host-editor";
import { HostKeyBanner } from "@/components/host-key-banner";
import { HostPreviewPane } from "@/components/host-preview-pane";
import { HOST_PUBLISH_STATUS_COPY, type HostPublishStatus } from "@/lib/draft-publish";
import type { HostPreviewSource } from "@/lib/host-live-draft";
import { eventTitleOrFallback, type PartyContent } from "@/lib/party-types";
import { cn } from "@/lib/utils";

export function HostWorkspace({
  slug,
  initial,
  published,
  publishStatus: initialPublishStatus,
  sample = false,
  guestUrl,
  publishedSnapshot,
  save,
  publish,
}: {
  slug: string;
  initial: PartyContent;
  published: boolean;
  publishStatus?: HostPublishStatus;
  sample?: boolean;
  guestUrl?: string;
  publishedSnapshot?: PartyContent;
  save: HostEditorAction;
  publish: (slug: string, hostKey?: string) => Promise<{ ok: boolean; error?: string; guestUrl?: string }>;
}) {
  const [liveContent, setLiveContent] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [publishStatus, setPublishStatus] = useState<HostPublishStatus>(
    initialPublishStatus ?? (published ? "live" : "draft-only"),
  );
  const [publishedUrl, setPublishedUrl] = useState<string | null>(published ? guestUrl ?? null : null);
  const [mobilePane, setMobilePane] = useState<"edit" | "preview">("edit");
  const [previewSource, setPreviewSource] = useState<HostPreviewSource>("draft");
  const [guestSnapshot, setGuestSnapshot] = useState(publishedSnapshot);
  const liveRef = useRef(liveContent);
  useEffect(() => {
    liveRef.current = liveContent;
  }, [liveContent]);
  const statusChip = HOST_PUBLISH_STATUS_COPY[publishStatus].chip;

  return (
    <div data-host-workspace="" className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{eventTitleOrFallback(liveContent.trip.siteName)}</h1>
        <span
          className="rounded-full border px-3 py-1 text-xs font-medium"
          aria-label={`Event status: ${statusChip}`}
        >
          {statusChip}
        </span>
        {publishedUrl ? (
          <Link href={publishedUrl} className="text-sm underline-offset-4 hover:text-primary hover:underline">
            Guest page
          </Link>
        ) : null}
      </header>
      <HostKeyBanner slug={slug} />

      <div
        className="mb-2 flex gap-1 rounded-lg bg-muted p-[3px] text-muted-foreground lg:hidden"
        role="tablist"
        aria-label="Host workspace"
        data-host-mobile-tabs=""
      >
        <button
          type="button"
          role="tab"
          aria-selected={mobilePane === "edit"}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-sm font-medium",
            mobilePane === "edit" ? "bg-background text-foreground shadow-sm" : "text-foreground/60",
          )}
          onClick={() => setMobilePane("edit")}
        >
          Edit
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobilePane === "preview"}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-sm font-medium",
            mobilePane === "preview" ? "bg-background text-foreground shadow-sm" : "text-foreground/60",
          )}
          onClick={() => setMobilePane("preview")}
        >
          Preview
        </button>
      </div>

      <div
        data-host-layout=""
        className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-6"
      >
        <div
          data-host-editor=""
          className={cn(mobilePane === "edit" ? "max-lg:block" : "max-lg:hidden")}
        >
          <HostEditor
            slug={slug}
            initial={initial}
            published={published}
            publishStatus={initialPublishStatus}
            sample={sample}
            guestUrl={guestUrl}
            save={save}
            publish={publish}
            onLiveContentChange={setLiveContent}
            onPublishStatusChange={(status) => {
              setPublishStatus(status);
              if (status === "live") setGuestSnapshot(liveRef.current);
            }}
            onPublishedUrlChange={setPublishedUrl}
            onDirtyChange={setDirty}
          />
        </div>
        <aside
          data-host-preview-column=""
          className={cn(
            "lg:sticky lg:top-16 lg:z-0 lg:max-h-[calc(100dvh-4.5rem)] lg:overflow-y-auto",
            mobilePane === "preview" ? "max-lg:block" : "max-lg:hidden",
          )}
        >
          <HostPreviewPane
            draftContent={liveContent}
            publishedSnapshot={guestSnapshot}
            published={published || Boolean(publishedUrl)}
            dirty={dirty}
            sample={sample}
            slug={slug}
            source={previewSource}
            onSourceChange={setPreviewSource}
          />
        </aside>
      </div>
    </div>
  );
}
