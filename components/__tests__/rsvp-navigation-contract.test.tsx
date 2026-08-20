/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HashFocusLink } from "@/components/hash-focus-link";
import { MobileNav, type MobileNavLink } from "@/components/mobile-nav";

const viewports = [
  { width: 1440, height: 900, navigation: "desktop" },
  { width: 390, height: 844, navigation: "mobile" },
  { width: 320, height: 700, navigation: "mobile" },
] as const;

const mobileLinks: MobileNavLink[] = [{ href: "#rsvp", label: "RSVP", focusId: "rsvp" }];
const scrollIntoView = vi.fn();
const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;

function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
}

function setScrollY(scrollY: number) {
  Object.defineProperty(window, "scrollY", { configurable: true, value: scrollY });
}

function addMeasuredTarget() {
  const target = document.createElement("section");
  target.id = "rsvp";

  // jsdom has no layout engine. Keep an absolute document position and make the
  // scroll API update scrollY, so the contract still checks real viewport math.
  const absoluteTop = 1227;
  const targetHeight = 180;
  vi.spyOn(target, "getBoundingClientRect").mockImplementation(
    () => new DOMRect(0, absoluteTop - window.scrollY, 320, targetHeight),
  );
  document.body.append(target);
  return { target };
}

function expectFullyVisible(target: HTMLElement, height: number) {
  const rect = target.getBoundingClientRect();
  expect(rect.top, `target top at ${window.innerWidth}x${height}`).toBeGreaterThanOrEqual(0);
  expect(rect.bottom, `target bottom at ${window.innerWidth}x${height}`).toBeLessThanOrEqual(height);
}

describe("RSVP lower-anchor navigation contract", () => {
  beforeEach(() => {
    cleanup();
    document.body.replaceChildren();
    window.history.replaceState(null, "", "/demo");
    setViewport(1024, 768);
    setScrollY(0);
    scrollIntoView.mockReset();
    scrollIntoView.mockImplementation(() => setScrollY(1203));
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
  });

  afterEach(() => {
    cleanup();
    document.documentElement.style.removeProperty("scroll-behavior");
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each(viewports)(
    "updates hash, focuses RSVP, closes mobile UI, and leaves the target visible at $width x $height",
    async ({ width, height, navigation }) => {
      setViewport(width, height);
      const { target } = addMeasuredTarget();
      target.addEventListener("focus", () => {
        expect(target.getBoundingClientRect().top).toBeGreaterThanOrEqual(0);
      });

      let frame: FrameRequestCallback | undefined;
      if (navigation === "mobile") {
        vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
          frame = callback;
          return 1;
        });
      }

      const user = userEvent.setup();
      if (navigation === "desktop") {
        render(
          <HashFocusLink href="#rsvp" focusId="rsvp">
            RSVP
          </HashFocusLink>,
        );
        await user.click(screen.getByRole("link", { name: "RSVP" }));
      } else {
        const { container } = render(<MobileNav links={mobileLinks} />);
        const details = container.querySelector("details")!;
        await user.click(screen.getByLabelText("Open menu"));
        await user.click(screen.getByRole("link", { name: "RSVP" }));
        expect(details.open).toBe(false);
        expect(frame).toEqual(expect.any(Function));
        expect(target.getBoundingClientRect().top).toBeGreaterThanOrEqual(height);
        frame?.(0);
      }

      expect(window.location.hash).toBe("#rsvp");
      expect(document.activeElement).toBe(target);
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
      expectFullyVisible(target, height);
    },
  );

  it("settles transient UI before focus and scroll", async () => {
    const order: string[] = [];
    const { target } = addMeasuredTarget();
    target.addEventListener("focus", () => order.push("focus"));
    scrollIntoView.mockImplementation(() => order.push("scroll"));

    let frame: FrameRequestCallback | undefined;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frame = callback;
      return 1;
    });

    const user = userEvent.setup();
    const { container } = render(<MobileNav links={mobileLinks} />);
    const details = container.querySelector("details")!;
    await user.click(screen.getByLabelText("Open menu"));
    await user.click(screen.getByRole("link", { name: "RSVP" }));

    expect(details.open).toBe(false);
    expect(order).toEqual([]);
    frame?.(0);
    expect(order).toEqual(["focus", "scroll"]);
  });

  it.each(viewports)(
    "requires a real settle when document smooth scrolling is active at $width x $height",
    async ({ width, height, navigation }) => {
      setViewport(width, height);
      document.documentElement.style.scrollBehavior = "smooth";
      scrollIntoView.mockImplementation((options?: ScrollIntoViewOptions) => {
        const smoothDocumentScroll =
          document.documentElement.style.scrollBehavior === "smooth" && options?.behavior === "smooth";
        if (!smoothDocumentScroll) setScrollY(1203);
      });
      vi.spyOn(window, "scrollTo").mockImplementation(() => setScrollY(1203));
      const { target } = addMeasuredTarget();

      const frames: FrameRequestCallback[] = [];
      vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
        frames.push(callback);
        return frames.length;
      });

      const user = userEvent.setup();
      if (navigation === "desktop") {
        render(
          <HashFocusLink href="#rsvp" focusId="rsvp">
            RSVP
          </HashFocusLink>,
        );
        await user.click(screen.getByRole("link", { name: "RSVP" }));
      } else {
        const { container } = render(<MobileNav links={mobileLinks} />);
        await user.click(screen.getByLabelText("Open menu"));
        await user.click(screen.getByRole("link", { name: "RSVP" }));
        expect(container.querySelector("details")?.open).toBe(false);
      }
      while (frames.length > 0) frames.shift()?.(0);

      expect(window.location.hash).toBe("#rsvp");
      expect(document.activeElement).toBe(target);
      expectFullyVisible(target, height);
      expect(scrollIntoView).toHaveBeenCalledTimes(2);
      expect(scrollIntoView).toHaveBeenNthCalledWith(1, { behavior: "smooth", block: "start" });
      expect(scrollIntoView).toHaveBeenNthCalledWith(2, { behavior: "auto", block: "start" });
      expect(window.scrollTo).not.toHaveBeenCalled();
    },
  );

  it("uses instant scrolling when reduced motion is preferred", async () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    addMeasuredTarget();
    const user = userEvent.setup();
    render(
      <HashFocusLink href="#rsvp" focusId="rsvp">
        RSVP
      </HashFocusLink>,
    );

    await user.click(screen.getByRole("link", { name: "RSVP" }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
  });

  it.each([
    { name: "a secondary-button click", event: { button: 1 } },
    { name: "a meta click", event: { metaKey: true } },
    { name: "a control click", event: { ctrlKey: true } },
    { name: "a shift click", event: { shiftKey: true } },
    { name: "an alternate click", event: { altKey: true } },
  ])("preserves native navigation for $name", ({ event }) => {
    const { target } = addMeasuredTarget();
    render(
      <HashFocusLink href="#rsvp" focusId="rsvp">
        RSVP
      </HashFocusLink>,
    );

    const link = screen.getByRole("link", { name: "RSVP" });
    const click = vi.fn((received: MouseEvent) => received.defaultPrevented);
    document.addEventListener("click", click, { once: true });
    fireEvent.click(link, event);

    expect(click).toHaveBeenCalledWith(expect.objectContaining({ defaultPrevented: false }));
    expect(window.location.hash).toBe("");
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(target);
  });
});
