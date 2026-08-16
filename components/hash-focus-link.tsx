"use client";

import type { ComponentProps, MouseEvent } from "react";

function focusIds(focusId: string | string[]): string[] {
  return Array.isArray(focusId) ? focusId : [focusId];
}

function firstElement(ids: string[]): HTMLElement | null {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) return el;
  }
  return null;
}

/** In-page hash link that moves keyboard/AT focus after scroll. */
export function HashFocusLink({
  href,
  focusId,
  onClick,
  ...props
}: ComponentProps<"a"> & {
  href: `#${string}`;
  focusId: string | string[];
}) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const section = document.getElementById(href.slice(1));
    const target = firstElement(focusIds(focusId));
    if (!section && !target) return;

    event.preventDefault();
    history.pushState(null, "", href);
    (section ?? target)?.scrollIntoView({ behavior: "smooth", block: "start" });
    target?.focus({ preventScroll: true });
  }

  return <a href={href} onClick={handleClick} {...props} />;
}
