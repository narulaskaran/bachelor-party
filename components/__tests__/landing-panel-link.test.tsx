/** @vitest-environment jsdom */

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LandingPanelLink } from "@/components/landing-panel-link";

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

describe("LandingPanelLink", () => {
  beforeEach(() => {
    cleanup();
    window.history.replaceState(null, "", "/");
  });

  it("points at the landing hash so other pages can deep-link", () => {
    render(<LandingPanelLink panel="create">Create a trip</LandingPanelLink>);

    expect(screen.getByRole("link", { name: /create a trip/i }).getAttribute("href")).toBe(
      "/#create",
    );
  });

  it("updates the hash in place when already on the homepage", async () => {
    const user = userEvent.setup();
    const onHash = vi.fn();
    window.addEventListener("hashchange", onHash);
    render(<LandingPanelLink panel="create">Create a trip</LandingPanelLink>);

    await user.click(screen.getByRole("link", { name: /create a trip/i }));

    expect(window.location.hash).toBe("#create");
    expect(onHash).toHaveBeenCalled();
    window.removeEventListener("hashchange", onHash);
  });
});
