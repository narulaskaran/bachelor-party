"use client";

import type { ReactNode } from "react";
import { useLayoutEffect } from "react";
import {
  focusHashDestination,
  prefersReducedMotion,
  scrollHashDestination,
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

    let firstFrame: number | undefined;
    let secondFrame: number | undefined;
    let cancelled = false;

    const navigate = () => {
      if (cancelled) return;
      const target = document.getElementById(targetId);
      if (!target) return;
      focusHashDestination(target);
      scrollHashDestination(target, prefersReducedMotion() ? "auto" : "smooth");
    };

    if (typeof requestAnimationFrame === "function") {
      firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(navigate);
      });
    } else {
      queueMicrotask(navigate);
    }

    return () => {
      cancelled = true;
      if (firstFrame !== undefined) cancelAnimationFrame(firstFrame);
      if (secondFrame !== undefined) cancelAnimationFrame(secondFrame);
    };
  }, [targetId]);

  return children;
}
