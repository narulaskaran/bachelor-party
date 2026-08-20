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

function focusDestination(element: HTMLElement) {
  if (!element.hasAttribute("tabindex") && element.tabIndex < 0) {
    element.tabIndex = -1;
  }
  element.focus({ preventScroll: true });
}

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Let transient UI close and layout settle before moving a lower anchor. */
function afterLayout(callback: () => void) {
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => callback());
  } else {
    queueMicrotask(callback);
  }
}

/** In-page hash link that moves keyboard/AT focus after the target is shown. */
export function HashFocusLink({
  href,
  focusId,
  scroll = true,
  deferFocus = false,
  onClick,
  ...props
}: ComponentProps<"a"> & {
  href: `#${string}`;
  focusId: string | string[];
  scroll?: boolean;
  /** Defer focus until after click handlers close transient UI such as menus. */
  deferFocus?: boolean;
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
    const destination = target ?? section;
    const navigate = () => {
      if (destination) focusDestination(destination);
      if (scroll) {
        (section ?? target)?.scrollIntoView({
          behavior: prefersReducedMotion() ? "auto" : "smooth",
          block: "start",
        });
      }
    };
    if (deferFocus) afterLayout(navigate);
    else navigate();
  }

  return <a href={href} onClick={handleClick} {...props} />;
}
