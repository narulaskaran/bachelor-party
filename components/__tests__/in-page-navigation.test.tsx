/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, createEvent, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HashFocusLink } from "@/components/hash-focus-link";
import { ActionItems } from "@/components/sections/action-items";
import { ActivitiesSection } from "@/components/sections/activities";

const scrollIntoView = vi.fn();

function addTarget(id: string) {
  const target = document.createElement("section");
  target.id = id;
  document.body.append(target);
}

describe("in-page navigation", () => {
  beforeEach(() => {
    cleanup();
    document.body.replaceChildren();
    window.history.replaceState(null, "", "/");
    scrollIntoView.mockReset();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("updates the hash, prevents default, scrolls, and focuses destination", () => {
    addTarget("rsvp");
    render(
      <HashFocusLink href="#rsvp" focusId="rsvp">
        RSVP
      </HashFocusLink>,
    );

    const link = screen.getByRole("link", { name: "RSVP" });
    const click = createEvent.click(link);
    const observed = vi.fn((event: MouseEvent) => event.defaultPrevented);
    document.addEventListener("click", observed, { once: true });

    fireEvent(link, click);

    expect(click.defaultPrevented).toBe(true);
    expect(observed).toHaveBeenCalledWith(expect.objectContaining({ defaultPrevented: true }));
    expect(window.location.hash).toBe("#rsvp");
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(document.activeElement).toBe(document.getElementById("rsvp"));
    expect(document.getElementById("rsvp")?.getAttribute("tabindex")).toBe("-1");
  });

  it("uses instant scrolling when reduced motion is preferred", async () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    const user = userEvent.setup();
    addTarget("rsvp");
    render(
      <HashFocusLink href="#rsvp" focusId="rsvp">
        RSVP
      </HashFocusLink>,
    );

    await user.click(screen.getByRole("link", { name: "RSVP" }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
  });

  it("falls back to an instant scroll when smooth scrolling does not move the target", () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    addTarget("rsvp");
    render(
      <HashFocusLink href="#rsvp" focusId="rsvp">
        RSVP
      </HashFocusLink>,
    );

    fireEvent.click(screen.getByRole("link", { name: "RSVP" }));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenLastCalledWith({ behavior: "smooth", block: "start" });

    while (frames.length > 0) {
      frames.shift()!(0);
    }

    expect(scrollIntoView).toHaveBeenCalledTimes(2);
    expect(scrollIntoView).toHaveBeenLastCalledWith({ behavior: "auto", block: "start" });
    expect(document.documentElement.style.scrollBehavior).toBe("");
  });

  it("smooth-scrolls action-item links to their section", async () => {
    const user = userEvent.setup();
    addTarget("rsvp");
    render(<ActionItems actionItems={[{ title: "RSVP below", anchor: "#rsvp" }]} />);

    await user.click(screen.getByRole("link", { name: "RSVP" }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(document.activeElement).toBe(document.getElementById("rsvp"));
  });

  it("smooth-scrolls activity RSVP links to the RSVP section", async () => {
    const user = userEvent.setup();
    addTarget("rsvp");
    render(<ActivitiesSection activities={{ backups: [{ slug: "rain", name: "Rainy-day backup" }] }} />);

    await user.click(screen.getByRole("link", { name: "Vote on these below." }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });
});
