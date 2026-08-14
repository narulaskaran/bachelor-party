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
    expect(screen.getByRole("link", { name: /try a sample trip/i }).getAttribute("href")).toBe(
      "/demo",
    );
    expect(screen.getByRole("heading", { name: /enter your trip/i })).toBeTruthy();
    expect(container.innerHTML).not.toContain("ADMIN_UI_PASSWORD");
    expect(container.innerHTML).not.toContain('href="/admin"');
  });

  it("renders a trip-entry form on every legacy hash the old pages 307 to", () => {
    render(<LandingView />);

    for (const hash of LEGACY_PAGE_HASHES) {
      expect(document.getElementById(hash), `#${hash}`).toBeTruthy();
    }
    expect(screen.getByLabelText(/trip code/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /open trip/i })).toBeTruthy();
    expect(screen.getByText(/yoursite.com\/your-trip/i)).toBeTruthy();
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
