/** @vitest-environment jsdom */

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MobileNav } from "@/components/mobile-nav";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
  } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const links = [
  { href: "/demo#rsvp", label: "RSVP" },
  { href: "/demo#schedule", label: "Schedule" },
  { href: "/demo#activities", label: "Activities" },
  { href: "/demo#basecamp", label: "Lodge" },
];

describe("MobileNav", () => {
  beforeEach(() => {
    cleanup();
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

    await user.click(screen.getByRole("link", { name: "RSVP" }));
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
