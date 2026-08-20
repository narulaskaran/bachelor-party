"use client";

import type { ReactNode } from "react";
import { useLayoutEffect } from "react";
import {
  afterTwoFrames,
  cancelFrameHandle,
  navigateHashDestination,
} from "@/components/hash-navigation";

/** Repair the browser's initial fragment position after hydration/layout settle. */
export function InitialHashFocus({
  targetId,
  children,
}: {
  targetId: string;
  children: ReactNode;
}) {
  useLayoutEffect(() => {
    if (window.location.hash !== `#${targetId}`) return;

    let cancelled = false;
    const frames = afterTwoFrames(() => {
      if (cancelled) return;
      const target = document.getElementById(targetId);
      if (!target) return;
      navigateHashDestination(target, { scrollTo: target });
    });

    return () => {
      cancelled = true;
      cancelFrameHandle(frames);
    };
  }, [targetId]);

  return children;
}
