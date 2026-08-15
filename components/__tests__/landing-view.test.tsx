/** @vitest-environment jsdom */

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LandingView } from "@/components/landing-view";
import { LEGACY_PAGE_HASHES } from "@/lib/legacy-page-redirects";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

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

describe("homepage trip entry", () => {
  beforeEach(() => {
    push.mockReset();
    cleanup();
  });

  it("offers Create a trip on the marketing landing without /admin", () => {
    const { container } = render(<LandingView />);

    expect(screen.getByRole("link", { name: /^create a trip$/i }).getAttribute("href")).toBe(
      "#create",
    );
    expect(document.getElementById("create")).toBeTruthy();
    expect(screen.getByLabelText(/trip name/i)).toBeTruthy();
    expect(screen.getByLabelText(/start date/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /^try a sample$/i }).getAttribute("href")).toBe(
      "/demo",
    );
    expect(screen.getByRole("link", { name: /^enter your trip$/i }).getAttribute("href")).toBe(
      "#rsvp",
    );
    expect(screen.getByRole("heading", { name: /enter your trip/i })).toBeTruthy();
    expect(container.innerHTML).not.toContain("ADMIN_UI_PASSWORD");
    expect(container.innerHTML).not.toContain('href="/admin"');
  });

  it("is a quiet centered tool page, not a poster with competing CTAs", () => {
    const { container } = render(<LandingView />);
    const html = container.innerHTML;

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("The Big Send");
    expect(html).toContain("tracking-tight");
    expect(html).toContain("max-w-3xl");
    expect(html).not.toContain("text-7xl");
    expect(html).not.toContain("uppercase tracking-wide");
    expect(html).not.toContain("Trip Logistics, Handled");
    expect(html).not.toContain("One Password");
    expect(html).not.toContain("Every Trip Detail");

    const create = screen.getByRole("link", { name: /^create a trip$/i });
    expect(create.closest("[data-slot=button]")).toBeTruthy();
    expect(screen.getByRole("link", { name: /^enter your trip$/i }).closest("[data-slot=button]")).toBeNull();
    expect(screen.getByRole("link", { name: /^try a sample$/i }).closest("[data-slot=button]")).toBeNull();
  });

  it("renders a trip-entry form on every legacy hash the old pages 307 to", () => {
    render(<LandingView />);

    for (const hash of LEGACY_PAGE_HASHES) {
      expect(document.getElementById(hash), `#${hash}`).toBeTruthy();
    }
    expect(screen.getByLabelText(/trip code/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /open trip/i })).toBeTruthy();
    expect(screen.getByText(/party\.narula\.xyz\/your-trip/i)).toBeTruthy();
    expect(screen.queryByText(/yoursite\.com/i)).toBeNull();
  });

  it("shows a request-host invite example when provided", () => {
    render(<LandingView inviteHost="preview.example" />);

    expect(screen.getByText(/preview\.example\/your-trip/i)).toBeTruthy();
    expect(screen.queryByText(/yoursite\.com/i)).toBeNull();
  });

  it("does not advertise the retired Vercel production alias as the invite host", () => {
    render(<LandingView />);

    expect(screen.getByText(/party\.narula\.xyz\/your-trip/i)).toBeTruthy();
    expect(screen.queryByText(/bachelor-party-eight\.vercel\.app/i)).toBeNull();
  });

  it("keeps the invite example URL on one line instead of wrapping mid-slug", () => {
    const { container } = render(<LandingView />);
    const example = container.querySelector("#trip-entry-hint span.font-mono");

    expect(example?.textContent).toBe("party.narula.xyz/your-trip");
    expect(example?.className).toMatch(/whitespace-nowrap/);
    expect(example?.className).toMatch(/break-normal/);
    expect(example?.className).not.toMatch(/break-words|break-all/);
  });

  it("navigates to /{slug} when the form is submitted", async () => {
    const user = userEvent.setup();
    render(<LandingView />);

    await user.type(screen.getByLabelText(/trip code/i), "jackson-hole-26");
    await user.click(screen.getByRole("button", { name: /open trip/i }));

    expect(push).toHaveBeenCalledWith("/jackson-hole-26");
  });

  it("navigates using a pasted invite URL", async () => {
    const user = userEvent.setup();
    render(<LandingView />);

    await user.type(
      screen.getByLabelText(/trip code/i),
      "https://example.com/cabin-weekend",
    );
    await user.click(screen.getByRole("button", { name: /open trip/i }));

    expect(push).toHaveBeenCalledWith("/cabin-weekend");
  });
});
