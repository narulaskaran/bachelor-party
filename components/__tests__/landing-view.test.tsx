/** @vitest-environment jsdom */

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
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

function resetHash() {
  const url = new URL(window.location.href);
  url.hash = "";
  window.history.replaceState(null, "", url);
}

describe("homepage trip entry", () => {
  beforeEach(() => {
    push.mockReset();
    cleanup();
    resetHash();
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("offers equal host and invite CTAs, and a quieter sample path", () => {
    const { container } = render(<LandingView />);

    const hosting = screen.getByRole("link", { name: /^i.m hosting$/i });
    const invite = screen.getByRole("link", { name: /^i have an invite$/i });
    expect(hosting.getAttribute("href")).toBe("#create");
    expect(invite.getAttribute("href")).toBe("#enter");
    expect(hosting.closest("[data-slot=button]")).toBeTruthy();
    expect(invite.closest("[data-slot=button]")).toBeTruthy();
    expect(hosting.closest("[data-slot=button]")!.className).toMatch(/min-h-11/);
    expect(invite.closest("[data-slot=button]")!.className).toMatch(/min-h-11/);
    expect(hosting.getAttribute("aria-expanded")).toBe("false");
    expect(invite.getAttribute("aria-expanded")).toBe("false");
    expect(document.getElementById("create")).toBeTruthy();
    expect(document.getElementById("enter")).toBeTruthy();
    expect(document.getElementById("create")?.hidden).toBe(true);
    expect(document.getElementById("enter")?.hidden).toBe(true);
    expect(screen.queryByRole("heading", { name: /^create a trip$/i })).toBeNull();
    expect(screen.queryByRole("heading", { name: /enter your trip/i })).toBeNull();
    expect(screen.getByRole("link", { name: /^try a sample$/i }).getAttribute("href")).toBe(
      "/demo",
    );
    expect(screen.getByRole("link", { name: /^try a sample$/i }).closest("[data-slot=button]")).toBeNull();
    expect(container.innerHTML).not.toContain("ADMIN_UI_PASSWORD");
    expect(container.innerHTML).not.toContain('href="/admin"');
    expect(container.innerHTML).not.toContain("password-gated");
    expect(container.innerHTML).not.toMatch(/#rsvp"/);
    expect(invite.getAttribute("href")).not.toBe("#rsvp");
  });

  it("is a quiet centered tool page, not a poster", () => {
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
    expect(html).toContain("One private page for the trip");
  });

  it("renders a trip-entry form on every legacy hash the old pages 307 to", () => {
    render(<LandingView />);

    for (const hash of LEGACY_PAGE_HASHES) {
      expect(document.getElementById(hash), `#${hash}`).toBeTruthy();
    }
    expect(screen.getByLabelText(/invite link or trip name/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /open trip/i, hidden: true })).toBeTruthy();
    expect(screen.getByRole("button", { name: /open trip/i, hidden: true }).className).toMatch(
      /min-h-11/,
    );
    expect(screen.getByRole("button", { name: /^create a trip$/i, hidden: true }).className).toMatch(
      /min-h-11/,
    );
    expect(screen.getByText(/party\.narula\.xyz/i)).toBeTruthy();
    expect(screen.queryByText(/yoursite\.com/i)).toBeNull();
  });

  it("shows a request-host invite example when provided", () => {
    render(<LandingView inviteHost="preview.example" />);

    expect(screen.getByText(/preview\.example/i)).toBeTruthy();
    expect(screen.queryByText(/yoursite\.com/i)).toBeNull();
  });

  it("does not advertise the retired Vercel production alias as the invite host", () => {
    render(<LandingView />);

    expect(screen.getByText(/party\.narula\.xyz/i)).toBeTruthy();
    expect(screen.queryByText(/bachelor-party-eight\.vercel\.app/i)).toBeNull();
  });

  it("wraps the invite example before the path, not mid-slug", () => {
    const { container } = render(<LandingView />);
    const example = container.querySelector("#trip-entry-hint .font-mono");

    expect(example?.textContent).toBe("party.narula.xyz/your-trip");
    expect(example?.innerHTML).toContain("<wbr>");
    expect(example?.querySelector(".whitespace-nowrap")?.textContent).toBe("party.narula.xyz");
    expect(example?.className).not.toMatch(/whitespace-nowrap/);
  });

  it("navigates to /{slug} when the form is submitted", async () => {
    const user = userEvent.setup();
    render(<LandingView />);

    await user.click(screen.getByRole("link", { name: /^i have an invite$/i }));
    await user.type(screen.getByLabelText(/invite link or trip name/i), "jackson-hole-26");
    await user.click(screen.getByRole("button", { name: /open trip/i }));

    expect(push).toHaveBeenCalledWith("/jackson-hole-26");
  });

  it("navigates using a pasted invite URL", async () => {
    const user = userEvent.setup();
    render(<LandingView />);

    await user.click(screen.getByRole("link", { name: /^i have an invite$/i }));
    await user.type(
      screen.getByLabelText(/invite link or trip name/i),
      "https://example.com/cabin-weekend",
    );
    await user.click(screen.getByRole("button", { name: /open trip/i }));

    expect(push).toHaveBeenCalledWith("/cabin-weekend");
  });

  it("reveals and focuses the trip name field after I'm hosting", async () => {
    const user = userEvent.setup();
    render(<LandingView />);

    await user.click(screen.getByRole("link", { name: /^i.m hosting$/i }));

    expect(document.getElementById("create")?.hidden).toBe(false);
    expect(document.getElementById("enter")?.hidden).toBe(true);
    expect(screen.getByRole("link", { name: /^i.m hosting$/i }).getAttribute("aria-expanded")).toBe(
      "true",
    );
    expect(screen.getByRole("heading", { name: /^create a trip$/i })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText(/^trip name$/i));
  });

  it("reveals and focuses the invite field after I have an invite", async () => {
    const user = userEvent.setup();
    render(<LandingView />);

    await user.click(screen.getByRole("link", { name: /^i have an invite$/i }));

    expect(document.getElementById("enter")?.hidden).toBe(false);
    expect(document.getElementById("create")?.hidden).toBe(true);
    expect(screen.getByRole("link", { name: /^i have an invite$/i }).getAttribute("aria-expanded")).toBe(
      "true",
    );
    expect(document.activeElement).toBe(screen.getByLabelText(/invite link or trip name/i));
  });

  it("switches from host to invite without keeping both forms in the a11y tree", async () => {
    const user = userEvent.setup();
    render(<LandingView />);

    await user.click(screen.getByRole("link", { name: /^i.m hosting$/i }));
    await user.click(screen.getByRole("link", { name: /^i have an invite$/i }));

    expect(document.getElementById("create")?.hidden).toBe(true);
    expect(document.getElementById("enter")?.hidden).toBe(false);
    expect(screen.queryByRole("heading", { name: /^create a trip$/i })).toBeNull();
    expect(screen.getByRole("heading", { name: /enter your trip/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /^i.m hosting$/i }).closest("[data-slot=button]")?.getAttribute("data-variant")).toBe(
      "outline",
    );
    expect(screen.getByRole("link", { name: /^i have an invite$/i }).closest("[data-slot=button]")?.getAttribute("data-variant")).toBe(
      "default",
    );
  });

  it("opens the create form when the URL hash is #create", () => {
    window.history.replaceState(null, "", "/#create");
    render(<LandingView />);

    expect(document.getElementById("create")?.hidden).toBe(false);
    expect(screen.getByRole("heading", { name: /^create a trip$/i })).toBeTruthy();
  });

  it("opens the invite form from a legacy page hash", () => {
    window.history.replaceState(null, "", "/#rsvp");
    render(<LandingView />);

    expect(document.getElementById("enter")?.hidden).toBe(false);
    expect(screen.getByRole("heading", { name: /enter your trip/i })).toBeTruthy();
  });

  it("hides the form again when the hash is cleared", async () => {
    const user = userEvent.setup();
    render(<LandingView />);

    await user.click(screen.getByRole("link", { name: /^i.m hosting$/i }));
    expect(document.getElementById("create")?.hidden).toBe(false);

    await act(async () => {
      window.history.pushState(null, "", "#");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(document.getElementById("create")?.hidden).toBe(true);
    expect(screen.queryByRole("heading", { name: /^create a trip$/i })).toBeNull();
  });

  it("wires enter errors to the invite field", async () => {
    const user = userEvent.setup();
    render(<LandingView />);

    await user.click(screen.getByRole("link", { name: /^i have an invite$/i }));
    await user.type(screen.getByLabelText(/invite link or trip name/i), "!!!");
    await user.click(screen.getByRole("button", { name: /open trip/i }));

    const input = screen.getByLabelText(/invite link or trip name/i);
    const alert = screen.getByRole("alert");
    expect(alert.id).toBe("trip-entry-error");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toContain("trip-entry-error");
    expect(input.getAttribute("aria-describedby")).toContain("trip-entry-hint");
    expect(push).not.toHaveBeenCalled();
  });
});
