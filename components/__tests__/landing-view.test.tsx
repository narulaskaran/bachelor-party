/** @vitest-environment jsdom */

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { LandingView } from "@/components/landing-view";
import {
  LANDING_PANEL_MOTION_MS,
  landingPanelMotionClass,
} from "@/components/landing-panel-section";
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

function panelEl(id: string) {
  return document.getElementById(id);
}

function panelFold(id: string) {
  return panelEl(id)?.querySelector("[data-landing-fold]");
}

async function waitForLandingMotion() {
  await act(async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  });
}

async function settlePosterHide() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, LANDING_PANEL_MOTION_MS));
  });
}

function expectPanel(id: string, open: boolean) {
  const el = panelEl(id);
  expect(el, `#${id}`).toBeTruthy();
  expect(el?.getAttribute("data-open")).toBe(open ? "true" : "false");
  expect(el?.hasAttribute("inert")).toBe(!open);
  expect(el?.getAttribute("aria-hidden")).toBe(open ? null : "true");
}

const scrollIntoView = vi.fn();

describe("homepage trip entry", () => {
  beforeEach(() => {
    push.mockReset();
    cleanup();
    resetHash();
    scrollIntoView.mockReset();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("offers equal host and invite CTAs without a demo path in the hero", () => {
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
    expect(hosting.closest("[data-slot=button]")?.getAttribute("data-variant")).toBe("outline");
    expect(invite.closest("[data-slot=button]")?.getAttribute("data-variant")).toBe("outline");
    expect(panelEl("create")).toBeTruthy();
    expect(panelEl("enter")).toBeTruthy();
    expectPanel("create", false);
    expectPanel("enter", false);
    expect(screen.queryByRole("heading", { name: /^create an event$/i })).toBeNull();
    expect(screen.queryByRole("heading", { name: /enter your trip/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /^try a sample$/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /^try demo$/i })).toBeNull();
    expect(container.innerHTML).not.toContain("ADMIN_UI_PASSWORD");
    expect(container.innerHTML).not.toContain('href="/admin"');
    expect(container.innerHTML).not.toContain("password-gated");
    expect(container.innerHTML).not.toMatch(/#rsvp"/);
    expect(invite.getAttribute("href")).not.toBe("#rsvp");
    expect(container.querySelector("legend")).toBeNull();
    expect(screen.getAllByRole("link", { name: /^i.m hosting$/i })).toHaveLength(1);
  });

  it("is a quiet centered tool page, not a poster", () => {
    const { container } = render(<LandingView />);
    const html = container.innerHTML;

    const title = screen.getByRole("heading", { level: 1 });
    expect(title.textContent).toBe("The Big Send");
    expect(title.querySelector(".text-primary")?.textContent).toBe("Send");
    expect(html).toContain("tracking-tight");
    expect(html).toContain("max-w-3xl");
    expect(html).toContain("data-landing-page");
    expect(html).not.toContain("text-7xl");
    expect(html).not.toContain("uppercase tracking-wide");
    expect(html).not.toContain("Trip Logistics, Handled");
    expect(html).not.toContain("One Password");
    expect(html).not.toContain("Every Trip Detail");
    expect(html).toContain("Paste a messy plan");
    expect(html).toContain("py-16");
    expect(html).toContain("sm:py-24");

    const tagline = screen.getByText(/paste a messy plan/i);
    expect(tagline.className).toMatch(/max-w-xl/);
    expect(tagline.className).toMatch(/mx-auto/);
    const posterInner = container.querySelector("[data-landing-poster] > div > div");
    expect(posterInner?.className).toMatch(/text-center/);
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
    const draft = screen.getByRole("button", { name: /turn into a draft/i, hidden: true });
    expect(draft.className).toMatch(/min-h-11/);
    expect(draft.className).toMatch(/self-start/);
    expect(draft.className).toMatch(/w-fit/);
    expect(draft.className).not.toMatch(/(?:^|\s)w-full(?:\s|$)/);
    const notes = screen.getByLabelText(/^your event notes$/i);
    expect(notes.getAttribute("data-slot")).toBe("textarea");
    expect(notes.className).toMatch(/focus-visible:border-ring/);
    expect(notes.className).toMatch(/focus-visible:ring-ring\/50/);
    expect(notes.className).not.toMatch(/focus-visible:ring-2(?:\s|$)/);
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

  it("keeps the invite example URL as one nowrap token", () => {
    const { container } = render(<LandingView />);
    const example = container.querySelector("#trip-entry-hint .font-mono");

    expect(example?.textContent).toBe("party.narula.xyz/g/…");
    expect(example?.innerHTML).not.toContain("<wbr>");
    expect(example?.querySelector(".whitespace-nowrap")).toBeNull();
    expect(example?.className).toMatch(/whitespace-nowrap/);
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

  it("reveals and focuses the notes field after I'm hosting", async () => {
    const user = userEvent.setup();
    render(<LandingView />);

    await user.click(screen.getByRole("link", { name: /^i.m hosting$/i }));

    expectPanel("create", true);
    expectPanel("enter", false);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(screen.getByRole("link", { name: /^i.m hosting$/i }).getAttribute("aria-expanded")).toBe(
      "true",
    );
    expect(screen.getByRole("heading", { name: /^create an event$/i })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText(/^your event notes$/i));
  });

  it("reveals and focuses the invite field after I have an invite", async () => {
    const user = userEvent.setup();
    render(<LandingView />);

    await user.click(screen.getByRole("link", { name: /^i have an invite$/i }));

    expectPanel("enter", true);
    expectPanel("create", false);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
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

    expectPanel("create", false);
    expectPanel("enter", true);
    expect(screen.queryByRole("heading", { name: /^create an event$/i })).toBeNull();
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
    const { container } = render(<LandingView />);
    const hero = container.querySelector("h1")?.closest("section");

    expectPanel("create", true);
    expect(screen.getByRole("heading", { name: /^create an event$/i })).toBeTruthy();
    expect(hero?.className).toMatch(/py-4/);
    expect(hero?.className).not.toMatch(/py-16/);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(screen.getByRole("link", { name: /^i.m hosting$/i })).toBeTruthy();
  });

  it("opens the invite form from a legacy page hash", () => {
    window.history.replaceState(null, "", "/#rsvp");
    render(<LandingView />);

    expectPanel("enter", true);
    expect(screen.getByRole("heading", { name: /enter your trip/i })).toBeTruthy();
  });

  it("hides the form again when the hash is cleared", async () => {
    const user = userEvent.setup();
    render(<LandingView />);

    await user.click(screen.getByRole("link", { name: /^i.m hosting$/i }));
    expectPanel("create", true);

    await act(async () => {
      window.history.pushState(null, "", "#");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expectPanel("create", false);
    expect(screen.queryByRole("heading", { name: /^create an event$/i })).toBeNull();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("The Big Send");
  });

  it("collapses the hero while create or enter is open and still animates the panel", async () => {
    const user = userEvent.setup();
    const { container } = render(<LandingView />);
    const hero = container.querySelector("h1")?.closest("section");
    const poster = container.querySelector("[data-landing-poster]");
    const posterInner = poster?.querySelector(":scope > div > div");

    expect(hero?.className).not.toMatch(/justify-center/);
    expect(hero?.className).toMatch(/py-16/);
    expect(hero?.className).toMatch(/sm:py-24/);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("The Big Send");
    expect(screen.getByText(/paste a messy plan/i)).toBeTruthy();

    await waitForLandingMotion();

    await user.click(screen.getByRole("link", { name: /^i.m hosting$/i }));

    expect(hero?.className).not.toMatch(/py-16/);
    expect(hero?.className).not.toMatch(/sm:py-24/);
    expect(hero?.className).toMatch(/py-4/);
    expect(hero?.className).toMatch(/transition-\[padding\]/);
    expect(hero?.className).toContain(landingPanelMotionClass);
    expect(poster?.className).toMatch(/grid-rows-\[0fr\]/);
    expect(poster?.className).toMatch(/opacity-0/);
    expect(poster?.className).toMatch(/transition-\[grid-template-rows,opacity\]/);
    expect(poster?.className).toContain(landingPanelMotionClass);
    expect(posterInner?.className).toMatch(/-translate-y-2/);
    expect(posterInner?.className).toMatch(/transition-transform/);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(container.querySelector("h1")?.hasAttribute("hidden")).toBe(false);
    expect(screen.getByText(/paste a messy plan/i).hasAttribute("hidden")).toBe(false);
    expect(container.querySelector("legend")).toBeNull();
    expect(screen.getAllByRole("link", { name: /^i.m hosting$/i })).toHaveLength(1);
    expect(screen.getByRole("link", { name: /^i.m hosting$/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /^i have an invite$/i })).toBeTruthy();
    expect(panelFold("create")?.className).toMatch(/transition-\[grid-template-rows,opacity\]/);
    expect(panelFold("create")?.className).toMatch(/motion-reduce:transition-none/);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });

    await settlePosterHide();

    expect(container.querySelector("h1")?.hasAttribute("hidden")).toBe(true);
    expect(screen.getByText(/paste a messy plan/i).hasAttribute("hidden")).toBe(true);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();

    const posterClass = poster?.className;
    const heroClass = hero?.className;
    await user.click(screen.getByRole("link", { name: /^i have an invite$/i }));

    expect(poster?.className).toBe(posterClass);
    expect(hero?.className).toBe(heroClass);
    expect(hero?.className).toMatch(/py-4/);
    expect(container.querySelector("h1")?.hasAttribute("hidden")).toBe(true);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(screen.getByRole("link", { name: /^i.m hosting$/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /enter your trip/i })).toBeTruthy();
  });

  it("puts quiet GitHub and Ko-fi icon links in the footer, not View on GitHub text", () => {
    render(<LandingView />);

    expect(screen.queryByText(/view on github/i)).toBeNull();

    const github = screen.getByRole("link", { name: "GitHub" });
    const kofi = screen.getByRole("link", { name: "Ko-fi" });
    expect(github.getAttribute("href")).toBe("https://github.com/narulaskaran/bachelor-party");
    expect(kofi.getAttribute("href")).toBe("https://ko-fi.com/Y8Y21CC8IA");
    expect(github.getAttribute("target")).toBe("_blank");
    expect(kofi.getAttribute("target")).toBe("_blank");
    expect(github.className).toMatch(/size-11/);
    expect(kofi.className).toMatch(/size-11/);
    expect(github.className).toMatch(/text-muted-foreground/);
    expect(github.className).toMatch(/hover:text-foreground/);
    expect(github.className).not.toMatch(/hover:text-primary/);
    expect(github.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 496 512");
    expect(kofi.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(github.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(kofi.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(github.querySelector("svg")?.getAttribute("class")).toMatch(/size-6/);
    expect(github.querySelector("svg")?.getAttribute("class")).toMatch(/fill-current/);
    expect(kofi.querySelector("svg")?.getAttribute("class")).toMatch(/fill-current/);
    expect(github.closest("footer")).toBeTruthy();
    expect(github.parentElement?.className).toMatch(/justify-center/);
  });

  it("restores the poster with the same motion when the panel closes", async () => {
    const user = userEvent.setup();
    const { container } = render(<LandingView />);
    const hero = container.querySelector("h1")?.closest("section");
    const poster = container.querySelector("[data-landing-poster]");
    const posterInner = poster?.querySelector(":scope > div > div");

    await waitForLandingMotion();
    await user.click(screen.getByRole("link", { name: /^i.m hosting$/i }));
    await settlePosterHide();

    await act(async () => {
      window.history.pushState(null, "", "#");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(hero?.className).toMatch(/py-16/);
    expect(hero?.className).toMatch(/transition-\[padding\]/);
    expect(hero?.className).toContain(landingPanelMotionClass);
    expect(poster?.className).toMatch(/grid-rows-\[1fr\]/);
    expect(poster?.className).toMatch(/opacity-100/);
    expect(poster?.className).toMatch(/transition-\[grid-template-rows,opacity\]/);
    expect(posterInner?.className).toMatch(/translate-y-0/);
    expect(container.querySelector("h1")?.hasAttribute("hidden")).toBe(false);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("The Big Send");
  });

  it("snaps the poster away when prefers-reduced-motion is set", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    const user = userEvent.setup();
    const { container } = render(<LandingView />);

    await waitForLandingMotion();
    await user.click(screen.getByRole("link", { name: /^i.m hosting$/i }));

    expect(container.querySelector("h1")?.hasAttribute("hidden")).toBe(true);
    expect(screen.getByText(/paste a messy plan/i).hasAttribute("hidden")).toBe(true);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(container.querySelector("[data-landing-poster]")?.className).toMatch(
      /motion-reduce:transition-none/,
    );
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
