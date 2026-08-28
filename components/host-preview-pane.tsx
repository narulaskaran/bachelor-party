"use client";

import { hostPreviewCaption, type HostPreviewSource } from "@/lib/host-live-draft";
import type { PartyContent } from "@/lib/party-types";
import { HostPartyPreview } from "@/components/host-party-preview";
import { cn } from "@/lib/utils";

export function HostPreviewPane({
  draftContent,
  publishedSnapshot,
  published,
  dirty,
  sample = false,
  slug,
  source,
  onSourceChange,
}: {
  draftContent: PartyContent;
  publishedSnapshot?: PartyContent;
  published: boolean;
  dirty: boolean;
  sample?: boolean;
  slug: string;
  source: HostPreviewSource;
  onSourceChange: (source: HostPreviewSource) => void;
}) {
  const guestsEnabled = published && Boolean(publishedSnapshot);
  const content = source === "guests" && publishedSnapshot ? publishedSnapshot : draftContent;
  const caption = hostPreviewCaption(source, dirty);

  return (
    <section
      aria-labelledby="preview-heading"
      data-host-preview=""
      className="rounded-xl border border-border bg-muted/20 p-4 sm:p-6"
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 id="preview-heading" className="text-lg font-semibold tracking-tight">
          Guest preview
        </h2>
        <div
          role="tablist"
          aria-label="Preview source"
          className="inline-flex rounded-lg bg-muted p-[3px] text-muted-foreground"
        >
          <button
            type="button"
            role="tab"
            aria-selected={source === "draft"}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium",
              source === "draft" ? "bg-background text-foreground shadow-sm" : "text-foreground/60",
            )}
            onClick={() => onSourceChange("draft")}
          >
            Draft
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={source === "guests"}
            aria-disabled={!guestsEnabled}
            disabled={!guestsEnabled}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium",
              source === "guests" ? "bg-background text-foreground shadow-sm" : "text-foreground/60",
            )}
            onClick={() => {
              if (guestsEnabled) onSourceChange("guests");
            }}
          >
            Guests see
          </button>
        </div>
        {caption ? (
          <p data-preview-caption="" className="text-sm text-muted-foreground">
            {caption}
          </p>
        ) : null}
      </div>
      <div inert>
        <HostPartyPreview content={content} sample={sample} slug={slug} />
      </div>
    </section>
  );
}
