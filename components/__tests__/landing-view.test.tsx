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
import {
  EVENT_PRESET_HINTS,
  EVENT_PRESET_PLACEHOLDERS,
} from "@/lib/event-preset";

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

function setViewport(width: number, height = 844) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
}

const scrollIntoView = vi.fn();

describe("homepage create", () => {
  beforeEach(() => {
    push.mockReset();
    cleanup();
    resetHash();
    setViewport(1440, 900);
    scrollIntoView.mockReset();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows Get started only — no invite tab or hosting/invite toggle", () => {
    const { container } = render(<LandingView />);

    const start = screen.getByRole("link", { name: /^get started$/i });
    expect(start.getAttribute("href")).toBe("#create");
    expect(start.closest("[data-slot=button]")).toBeTruthy();
    expect(start.closest("[data-slot=button]")!.className).toMatch(/min-h-11/);
    expect(start.getAttribute("aria-expanded")).toBe("false");
    expect(start.closest("[data-slot=button]")?.getAttribute("data-variant")).toBe("default");
    expect(start.closest("[data-slot=button]")!.className).toMatch(/bg-primary/);
    expect(screen.getAllByRole("link", { name: /^get started$/i })).toHaveLength(1);
    expect(screen.queryByRole("link", { name: /^i.m hosting$/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /^i have an invite$/i })).toBeNull();
    expect(panelEl("create")).toBeTruthy();
    expect(panelEl("enter")).toBeNull();
    expectPanel("create", false);
    expect(screen.queryByRole("heading", { name: /^create an event$/i })).toBeNull();
    expect(screen.queryByRole("heading", { name: /enter your (trip|event)/i })).toBeNull();
    expect(screen.queryByLabelText(/invite link/i)).toBeNull();
    expect(screen.queryByRole("link", { name: /^try a sample$/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /^try demo$/i })).toBeNull();
    expect(container.innerHTML).not.toContain("ADMIN_UI_PASSWORD");
    expect(container.innerHTML).not.toContain('href="/admin"');
    expect(container.innerHTML).not.toContain("password-gated");
    expect(container.innerHTML).not.toMatch(/#rsvp"/);
    expect(container.innerHTML).not.toContain('href="#enter"');
    expect(container.querySelector("legend")).toBeNull();
  });

  it("is a quiet centered tool page, not a poster", () => {
    const { container } = render(<LandingView />);
    const html = container.innerHTML;

    const title = screen.getByRole("heading", { level: 1 });
    expect(title.textContent).toBe("Party Time");
    expect(title.querySelector(".text-primary")?.textContent).toBe("Time");
    expect(html).toContain("tracking-tight");
    expect(html).toContain("max-w-3xl");
    expect(html).toContain("data-landing-page");
    expect(html).not.toContain("text-7xl");
    expect(html).not.toContain("uppercase tracking-wide");
    expect(html).not.toContain("Trip Logistics, Handled");
    expect(html).not.toContain("One Password");
    expect(html).not.toContain("Every Trip Detail");
    expect(html).toContain("Dump the plan. Send the page.");
    expect(html).not.toContain("Paste a messy plan");
    expect(html).toContain("py-16");
    expect(html).toContain("sm:py-24");

    const tagline = screen.getByText(/dump the plan\. send the page\./i);
    expect(tagline.className).toMatch(/max-w-xl/);
    expect(tagline.className).toMatch(/mx-auto/);
    const posterInner = container.querySelector("[data-landing-poster] > div > div");
    expect(posterInner?.className).toMatch(/text-center/);
  });

  it("keeps create-form chrome without dump subtitle, invent hint, or invite copy", () => {
    render(<LandingView />);

    const draft = screen.getByRole("button", { name: /^create draft$/i, hidden: true });
    expect(draft.getAttribute("data-variant")).toBe("default");
    expect(draft.className).toMatch(/bg-primary/);
    expect(draft.className).toMatch(/min-h-11/);
    expect(draft.className).toMatch(/self-start/);
    expect(draft.className).toMatch(/w-fit/);
    expect(draft.className).not.toMatch(/(?:^|\s)w-full(?:\s|$)/);
    const notes = screen.getByLabelText(/^describe your event$/i);
    expect(notes.getAttribute("data-slot")).toBe("textarea");
    expect(notes.className).toMatch(/focus-visible:border-ring/);
    expect(notes.className).toMatch(/focus-visible:ring-ring\/50/);
    expect(notes.className).not.toMatch(/focus-visible:ring-2(?:\s|$)/);
    expect(screen.queryByText(/dump what you know/i)).toBeNull();
    expect(screen.queryByText(/won.t invent a time, place, or headcount/i)).toBeNull();
    expect(screen.queryByText(/older events may still/i)).toBeNull();
    expect(document.getElementById("create-trip-hint")).toBeNull();
    expect(document.getElementById("create-trip-facts-hint")).toBeNull();
  });

  it("reveals and focuses Describe your event after Get started on desktop", async () => {
    const user = userEvent.setup();
    render(<LandingView />);

    await user.click(screen.getByRole("link", { name: /^get started$/i }));

    expectPanel("create", true);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(screen.getByRole("link", { name: /^get started$/i }).getAttribute("aria-expanded")).toBe(
      "true",
    );
    expect(screen.getByRole("heading", { name: /^create an event$/i })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText(/^describe your event$/i));
    expect(screen.getByRole("link", { name: /^get started$/i }).closest("[data-slot=button]")?.getAttribute("data-variant")).toBe(
      "default",
    );
  });

  it("opens create on a phone without focusing the notes field", async () => {
    setViewport(390, 844);
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query.includes("(pointer: coarse)") || query.includes("(max-width: 639px)"),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    const user = userEvent.setup();
    render(<LandingView />);

    await user.click(screen.getByRole("link", { name: /^get started$/i }));

    expectPanel("create", true);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(document.activeElement).not.toBe(screen.getByLabelText(/^describe your event$/i));
    const heading = screen.getByRole("heading", { name: /^create an event$/i });
    expect(document.activeElement).toBe(heading);
    expect(heading.className).toMatch(/outline-none/);
    expect(heading.className).not.toMatch(/ring-3/);
    expect(heading.className).not.toMatch(/focus-visible:ring/);
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
    expect(screen.getByRole("link", { name: /^get started$/i })).toBeTruthy();
  });

  it("does not revive an invite panel from a leftover #enter hash", () => {
    window.history.replaceState(null, "", "/#enter");
    render(<LandingView />);

    expectPanel("create", false);
    expect(panelEl("enter")).toBeNull();
    expect(screen.queryByRole("heading", { name: /enter your (trip|event)/i })).toBeNull();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Party Time");
  });

  it("hides the form again when the hash is cleared", async () => {
    const user = userEvent.setup();
    render(<LandingView />);

    await user.click(screen.getByRole("link", { name: /^get started$/i }));
    expectPanel("create", true);

    await act(async () => {
      window.history.pushState(null, "", "#");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expectPanel("create", false);
    expect(screen.queryByRole("heading", { name: /^create an event$/i })).toBeNull();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Party Time");
  });

  it("collapses the hero while create is open and still animates the panel", async () => {
    const user = userEvent.setup();
    const { container } = render(<LandingView />);
    const hero = container.querySelector("h1")?.closest("section");
    const poster = container.querySelector("[data-landing-poster]");
    const posterInner = poster?.querySelector(":scope > div > div");

    expect(hero?.className).not.toMatch(/justify-center/);
    expect(hero?.className).toMatch(/py-16/);
    expect(hero?.className).toMatch(/sm:py-24/);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Party Time");
    expect(screen.getByText(/dump the plan\. send the page\./i)).toBeTruthy();

    await waitForLandingMotion();

    await user.click(screen.getByRole("link", { name: /^get started$/i }));

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
    expect(screen.getByText(/dump the plan\. send the page\./i).hasAttribute("hidden")).toBe(false);
    expect(container.querySelector("legend")).toBeNull();
    expect(screen.getAllByRole("link", { name: /^get started$/i })).toHaveLength(1);
    expect(panelFold("create")?.className).toMatch(/transition-\[grid-template-rows,opacity\]/);
    expect(panelFold("create")?.className).toMatch(/motion-reduce:transition-none/);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(screen.getByRole("radio", { name: /party/i })).toBeTruthy();
    expect(screen.getByRole("radio", { name: /group trip/i })).toBeTruthy();
    expect(screen.getByText(EVENT_PRESET_HINTS["night-out"])).toBeTruthy();
    expect(screen.getByText(EVENT_PRESET_HINTS.weekend)).toBeTruthy();

    await settlePosterHide();

    expect(container.querySelector("h1")?.hasAttribute("hidden")).toBe(true);
    expect(screen.getByText(/dump the plan\. send the page\./i).hasAttribute("hidden")).toBe(true);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
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
    await user.click(screen.getByRole("link", { name: /^get started$/i }));
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
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Party Time");
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
    await user.click(screen.getByRole("link", { name: /^get started$/i }));

    expect(container.querySelector("h1")?.hasAttribute("hidden")).toBe(true);
    expect(screen.getByText(/dump the plan\. send the page\./i).hasAttribute("hidden")).toBe(true);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(container.querySelector("[data-landing-poster]")?.className).toMatch(
      /motion-reduce:transition-none/,
    );
  });

  it("uses the Group trip placeholder until Party is selected", async () => {
    const user = userEvent.setup();
    render(<LandingView />);
    await user.click(screen.getByRole("link", { name: /^get started$/i }));

    const notes = screen.getByLabelText(/^describe your event$/i);
    expect(notes.getAttribute("placeholder")).toBe(EVENT_PRESET_PLACEHOLDERS.weekend);
    await user.click(screen.getByRole("radio", { name: /party/i }));
    expect(notes.getAttribute("placeholder")).toBe(EVENT_PRESET_PLACEHOLDERS["night-out"]);
  });
});
