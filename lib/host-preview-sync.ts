"use client";

import { useEffect, useState } from "react";
import type { PartyContent } from "@/lib/party-types";

/** Debounce draft→live preview on the lg+ split. 150–300ms is the UX contract. */
export const HOST_PREVIEW_DEBOUNCE_MS = 200;
export const HOST_LG_MEDIA_QUERY = "(min-width: 1024px)";

function prefersLgSplit(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
  return window.matchMedia(HOST_LG_MEDIA_QUERY).matches;
}

/**
 * lg+: live preview, debounced.
 * Below lg: Edit tab does not rebuild; Preview tab builds on show when the draft changed.
 */
export function useHostPreviewContent(
  draft: PartyContent,
  mobilePane: "edit" | "preview",
): PartyContent {
  const [isLg, setIsLg] = useState(prefersLgSplit);
  const [shown, setShown] = useState(draft);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(HOST_LG_MEDIA_QUERY);
    const sync = () => setIsLg(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!isLg && mobilePane !== "preview") return;
    const delay = isLg ? HOST_PREVIEW_DEBOUNCE_MS : 0;
    const timer = window.setTimeout(() => setShown(draft), delay);
    return () => window.clearTimeout(timer);
  }, [draft, isLg, mobilePane]);

  return shown;
}
