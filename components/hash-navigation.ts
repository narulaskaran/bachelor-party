export function focusHashDestination(element: HTMLElement) {
  if (!element.hasAttribute("tabindex") && element.tabIndex < 0) {
    element.tabIndex = -1;
  }
  element.focus({ preventScroll: true });
}

export function prefersReducedMotion() {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Coarse pointer or below Tailwind `sm` (640px) — the site's phone-first layout. */
export function isPhoneLayout() {
  if (typeof window === "undefined") return false;
  if (typeof window.matchMedia === "function") {
    if (window.matchMedia("(pointer: coarse)").matches) return true;
    if (window.matchMedia("(max-width: 639px)").matches) return true;
  }
  return window.innerWidth < 640;
}

export function isTextEntryControl(element: HTMLElement) {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  );
}

export function hashScrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? "auto" : "smooth";
}

export function afterNextPaint(callback: () => void): number | undefined {
  if (typeof requestAnimationFrame === "function") {
    return requestAnimationFrame(() => callback());
  }
  queueMicrotask(callback);
  return undefined;
}

export type FrameHandle = { first?: number; second?: number };

export function afterTwoFrames(callback: () => void): FrameHandle {
  const handle: FrameHandle = {};
  if (typeof requestAnimationFrame === "function") {
    handle.first = requestAnimationFrame(() => {
      handle.second = requestAnimationFrame(callback);
    });
  } else {
    queueMicrotask(callback);
  }
  return handle;
}

export function cancelFrameHandle(handle: FrameHandle) {
  if (handle.first !== undefined) cancelAnimationFrame(handle.first);
  if (handle.second !== undefined) cancelAnimationFrame(handle.second);
}

export function navigateHashDestination(
  focus: HTMLElement | null,
  options?: { scrollTo?: HTMLElement | null },
) {
  if (focus) focusHashDestination(focus);
  if (options?.scrollTo) {
    scrollHashDestination(options.scrollTo, hashScrollBehavior());
  }
}

/**
 * Scroll an anchor with a deterministic fallback for browsers that suppress
 * programmatic smooth scrolling while the document requests scroll-smooth.
 */
export function scrollHashDestination(element: HTMLElement, behavior: ScrollBehavior) {
  const initialTop = element.getBoundingClientRect().top;
  element.scrollIntoView({ behavior, block: "start" });
  if (behavior !== "smooth") return;

  const settle = () => {
    if (Math.abs(element.getBoundingClientRect().top - initialTop) > 1) return;

    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    element.scrollIntoView({ behavior: "auto", block: "start" });
    root.style.scrollBehavior = previousScrollBehavior;
  };

  afterTwoFrames(settle);
}
