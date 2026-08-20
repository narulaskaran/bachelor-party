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

  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => requestAnimationFrame(settle));
  } else {
    queueMicrotask(settle);
  }
}
