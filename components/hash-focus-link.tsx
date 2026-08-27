"use client";

import type { ComponentProps, MouseEvent } from "react";
import {
  afterNextPaint,
  isPhoneLayout,
  isTextEntryControl,
  navigateHashDestination,
} from "@/components/hash-navigation";

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
    const ids = Array.isArray(focusId) ? focusId : [focusId];
    const skipTextEntry = isPhoneLayout();
    let target: HTMLElement | null = null;
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      if (skipTextEntry && isTextEntryControl(el)) continue;
      target = el;
      break;
    }
    if (!section && !target) return;

    event.preventDefault();
    history.pushState(null, "", href);
    const destination = target ?? section;
    const navigate = () => {
      navigateHashDestination(destination, {
        scrollTo: scroll ? section ?? target : null,
      });
    };
    if (deferFocus) afterNextPaint(navigate);
    else navigate();
  }

  return <a href={href} onClick={handleClick} {...props} />;
}
