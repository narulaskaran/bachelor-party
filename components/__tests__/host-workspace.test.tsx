/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import { ingestEventPlan } from "@/lib/plan-ingestion";
import type { PartyContent } from "@/lib/party-types";

vi.mock("@/components/host-party-preview", () => ({
  HostPartyPreview: ({ content }: { content: PartyContent }) =>
    `PREVIEW:${content.trip.siteName}:${content.trip.location ?? ""}:${content.trip.startDate ?? ""}:${content.trip.endDate ?? ""}`,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => <a href={href} {...props}>{children}</a>,
}));

import { HostWorkspace } from "@/components/host-workspace";

const draft: PartyContent = {
  kind: "trip",
  trip: {
    siteName: "Cabin Weekend",
    startDate: "2026-09-04",
    endDate: "2026-09-07",
    location: "Denver",
  },
};

const published: PartyContent = {
  kind: "trip",
  trip: {
    siteName: "Published Cabin",
    startDate: "2026-09-04",
    endDate: "2026-09-07",
    location: "Denver",
  },
};

function renderWorkspace(overrides: Partial<ComponentProps<typeof HostWorkspace>> = {}) {
  return render(
    <HostWorkspace
      slug="cabin-weekend"
      initial={draft}
      published={false}
      publishStatus="draft-only"
      save={vi.fn(async () => ({ ok: true as const }))}
      publish={vi.fn(async () => ({ ok: true as const }))}
      {...overrides}
    />,
  );
}

describe("HostWorkspace layout and preview", () => {
  afterEach(() => cleanup());
  beforeEach(() => sessionStorage.clear());

  it("uses a split editor/preview at lg and Edit | Preview tabs below lg", () => {
    const { container } = renderWorkspace();
    const tabs = container.querySelector("[data-host-mobile-tabs]");
    const layout = container.querySelector("[data-host-layout]");
    const editor = container.querySelector("[data-host-editor]");
    const preview = container.querySelector("[data-host-preview-column]");

    expect(tabs?.className).toContain("lg:hidden");
    expect(screen.getByRole("tab", { name: /^edit$/i }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: /^preview$/i }).getAttribute("aria-selected")).toBe("false");
    expect(layout?.className).toContain("lg:grid");
    expect(layout?.className).toContain("lg:grid-cols-2");
    expect(preview?.className).toContain("lg:sticky");
    expect(preview?.className).toContain("lg:top-16");
    expect(editor?.className).toContain("max-lg:block");
    expect(preview?.className).toContain("max-lg:hidden");
    expect(container.querySelectorAll("[data-host-preview]")).toHaveLength(1);
    expect(container.querySelectorAll("[data-host-editor]")).toHaveLength(1);
    expect(screen.getByLabelText("Event status: Draft only").textContent).toBe("Draft only");
    expect(screen.queryByRole("link", { name: /^guest page$/i })).toBeNull();
    expect(screen.queryByText("Published + draft")).toBeNull();
  });

  it("does not stack a second guest preview under the editor", () => {
    const { container } = renderWorkspace();
    expect(container.querySelectorAll("[data-host-preview]")).toHaveLength(1);
    expect(container.querySelectorAll("[data-host-workspace]")).toHaveLength(1);
    expect(screen.queryByRole("main")).toBeNull();
  });

  it("keeps Guests see off until the first publish and labels an unsaved draft", async () => {
    renderWorkspace();
    const guestsSee = screen.getByRole("tab", { name: /guests see/i });
    expect(guestsSee.hasAttribute("disabled")).toBe(true);
    expect(guestsSee.getAttribute("aria-disabled")).toBe("true");
    expect(screen.queryByText("Guests currently see")).toBeNull();
    expect(screen.queryByText("Previewing unsaved")).toBeNull();

    fireEvent.change(screen.getByLabelText("Event title"), { target: { value: "Updated title" } });
    await waitFor(() => expect(screen.getByText(/PREVIEW:Updated title/)).toBeTruthy());
    expect(screen.getByText("Previewing unsaved")).toBeTruthy();
    expect(screen.queryByText("Guests currently see")).toBeNull();
  });

  it("shows Guests currently see only on the published snapshot", () => {
    renderWorkspace({
      initial: draft,
      published: true,
      publishStatus: "unpublished-changes",
      guestUrl: `/g/${"a".repeat(32)}`,
      publishedSnapshot: published,
    });

    expect(screen.getByRole("tab", { name: /guests see/i }).hasAttribute("disabled")).toBe(false);
    expect(screen.getByLabelText("Event status: Unpublished changes").textContent).toBe("Unpublished changes");
    expect(screen.getByRole("link", { name: /^guest page$/i })).toBeTruthy();
    expect(screen.getByText(/PREVIEW:Cabin Weekend/)).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: /guests see/i }));
    expect(screen.getByText("Guests currently see")).toBeTruthy();
    expect(screen.queryByText("Previewing unsaved")).toBeNull();
    expect(screen.getByText(/PREVIEW:Published Cabin/)).toBeTruthy();
    expect(screen.queryByText(/PREVIEW:Cabin Weekend/)).toBeNull();
  });

  it("keeps last valid dates in the live preview when the range is inverted", async () => {
    renderWorkspace();
    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-09-01" } });
    await waitFor(() =>
      expect(screen.getByText(/PREVIEW:Cabin Weekend:Denver:2026-09-04:2026-09-07/)).toBeTruthy(),
    );
    expect(screen.getByText(/PREVIEW:Cabin Weekend/).textContent).not.toMatch(/2026-09-01/);
  });

  it("shows a compact title, status chip, and guest link once Live — not the essay", () => {
    renderWorkspace({
      published: true,
      publishStatus: "live",
      guestUrl: "/g/token",
      publishedSnapshot: draft,
    });
    expect(screen.getByRole("heading", { name: "Cabin Weekend" })).toBeTruthy();
    expect(screen.getByLabelText("Event status: Live").textContent).toBe("Live");
    expect(screen.getByRole("link", { name: /^guest page$/i }).getAttribute("href")).toBe("/g/token");
    expect(screen.queryByText(/review the event your crew will trust/i)).toBeNull();
    expect(screen.queryByText(/private host workspace/i)).toBeNull();
    expect(screen.queryByText(/check every extracted fact/i)).toBeNull();
  });

  it("does not crash when Event title is cleared; preview and header use Untitled event", async () => {
    renderWorkspace();
    fireEvent.change(screen.getByLabelText("Event title"), { target: { value: "" } });
    await waitFor(() => expect(screen.getByText(/PREVIEW:Untitled event/)).toBeTruthy());
    expect((screen.getByLabelText("Event title") as HTMLInputElement).value).toBe("");
    expect(screen.getByRole("heading", { name: "Untitled event" })).toBeTruthy();
  });

  it("keeps Untitled event as a display fallback without confirming Event name after a nameless dump", async () => {
    const { content } = await ingestEventPlan(
      "driving up to the Catskills Friday",
      { preset: "night-out" },
      { extract: async () => ({ location: "the Catskills" }) },
    );
    renderWorkspace({ initial: content });
    expect(screen.getByRole("heading", { name: "Untitled event" })).toBeTruthy();
    expect(screen.getByText(/PREVIEW:Untitled event:the Catskills/)).toBeTruthy();
    const nameFact = screen.getByText("Event name").closest("li");
    expect(nameFact?.textContent).toMatch(/missing/i);
    expect(nameFact?.textContent).not.toMatch(/confirmed/i);
    expect(nameFact?.textContent).not.toMatch(/Untitled event/i);
    expect(screen.getByText("Where").closest("li")?.textContent).toMatch(/extracted/i);
  });
});
