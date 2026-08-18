/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MobileNav, type MobileNavLink } from "@/components/mobile-nav";

const links: MobileNavLink[] = [
  { href: "#rsvp", label: "RSVP", focusId: "rsvp" },
  { href: "#schedule", label: "Schedule", focusId: "schedule" },
  { href: "#activities", label: "Activities", focusId: "activities" },
  { href: "#lodge", label: "Lodge", focusId: "lodge" },
];

const scrollIntoView = vi.fn();

describe("MobileNav", () => {
  beforeEach(() => {
    cleanup();
    document.body.replaceChildren();
    window.history.replaceState(null, "", "/demo");
    scrollIntoView.mockReset();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
  });

  it("uses an opaque panel background with an opaque parent", () => {
    const { container } = render(<MobileNav links={links} />);
    const details = container.querySelector("details");
    const panel = details?.querySelector("nav");
    const parent = panel?.parentElement;

    expect(details).toBeTruthy();
    expect(panel).toBeTruthy();
    expect(parent).toBeTruthy();
    expect(panel!.className).toMatch(/(?:^|\s)bg-background(?:\s|$)/);
    expect(panel!.className).not.toMatch(/bg-background\//);
    expect(panel!.className).not.toContain("backdrop-blur");
    expect(parent!.className).toMatch(/(?:^|\s)bg-background(?:\s|$)/);
    expect(parent!.className).not.toMatch(/bg-background\//);
    expect(parent!.className).not.toContain("bg-transparent");
    expect(details!.className).not.toContain("bg-transparent");
  });

  it("removes the open state when a section link is activated", async () => {
    const user = userEvent.setup();
    const { container } = render(<MobileNav links={links} />);
    const details = container.querySelector("details")!;

    await user.click(screen.getByLabelText("Open menu"));
    expect(details.open).toBe(true);

    expect(screen.getByLabelText("Close menu")).toBeTruthy();
    expect(screen.queryByLabelText("Open menu")).toBeNull();

    await user.click(screen.getByRole("link", { name: "RSVP" }));
    expect(details.open).toBe(false);
    expect(screen.getByLabelText("Open menu")).toBeTruthy();
  });

  it("smooth-scrolls to the selected section", async () => {
    const user = userEvent.setup();
    const target = document.createElement("section");
    target.id = "rsvp";
    document.body.append(target);
    const { container } = render(<MobileNav links={links} />);
    const details = container.querySelector("details")!;

    await user.click(screen.getByLabelText("Open menu"));
    await user.click(screen.getByRole("link", { name: "RSVP" }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(window.location.hash).toBe("#rsvp");
    expect(document.activeElement).toBe(target);
    expect(details.open).toBe(false);
  });

  it("closes on an outside tap", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <div>
        <MobileNav links={links} />
        <button type="button">outside</button>
      </div>,
    );
    const details = container.querySelector("details")!;

    await user.click(screen.getByLabelText("Open menu"));
    expect(details.open).toBe(true);

    await user.click(screen.getByRole("button", { name: "outside" }));
    expect(details.open).toBe(false);
  });
});
