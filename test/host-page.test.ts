import { createElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PartyContent } from "@/lib/party-types";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children?: ReactNode;
    [key: string]: unknown;
  }) => createElement("a", { href, ...props }, children),
}));

vi.mock("@/lib/resolve-party", () => ({
  resolvePartyBySlug: vi.fn(),
}));

vi.mock("@/lib/host-access", () => ({
  hostSessionForSlug: vi.fn(),
  getHostEditorState: vi.fn(),
  getHostGuests: vi.fn(),
  saveHostDraft: vi.fn(),
  publishHostDraft: vi.fn(),
}));

vi.mock("@/components/host-editor", () => ({
  HostEditor: () => "HOST_EDITOR",
}));

vi.mock("@/components/host-key-banner", () => ({
  HostKeyBanner: () => null,
}));

vi.mock("@/components/host-schedule-view", () => ({
  HostScheduleView: () => null,
}));

vi.mock("@/components/organizer-roster", () => ({
  OrganizerRoster: () => null,
}));

vi.mock("@/components/party-view", () => ({
  PartyView: ({ sample, preview }: { sample?: boolean; preview?: boolean }) =>
    `PARTY_VIEW sample=${String(Boolean(sample))} preview=${String(Boolean(preview))}`,
}));

import HostPage from "@/app/[slug]/host/page";
import { getHostEditorState, getHostGuests, hostSessionForSlug } from "@/lib/host-access";
import { resolvePartyBySlug } from "@/lib/resolve-party";

const nightOut: PartyContent = {
  kind: "trip",
  preset: "night-out",
  trip: {
    siteName: "Friday drinks",
    startDate: "2026-09-04",
    startTime: "7:00 PM",
    location: "The Dead Rabbit, NYC",
  },
};

describe("host guest preview", () => {
  afterEach(() => {
    vi.mocked(resolvePartyBySlug).mockReset();
    vi.mocked(hostSessionForSlug).mockReset();
    vi.mocked(getHostEditorState).mockReset();
    vi.mocked(getHostGuests).mockReset();
  });

  it("does not mark a real draft as the /demo sample", async () => {
    vi.mocked(resolvePartyBySlug).mockResolvedValue({ status: "unpublished" });
    vi.mocked(hostSessionForSlug).mockResolvedValue(true);
    vi.mocked(getHostEditorState).mockResolvedValue({
      ok: true,
      content: nightOut,
      published: false,
      sample: false,
    });
    vi.mocked(getHostGuests).mockResolvedValue([]);

    const html = renderToStaticMarkup(
      (await HostPage({ params: Promise.resolve({ slug: "friday-drinks" }) })) as ReactElement,
    );

    expect(html).toContain("Guest preview");
    expect(html).toContain("inert");
    expect(html).toContain("PARTY_VIEW sample=false preview=true");
    expect(html).not.toContain("PARTY_VIEW sample=true");
  });

  it("keeps /demo host preview on sample copy", async () => {
    vi.mocked(resolvePartyBySlug).mockResolvedValue({
      status: "open",
      content: nightOut,
    });
    vi.mocked(hostSessionForSlug).mockResolvedValue(true);
    vi.mocked(getHostEditorState).mockResolvedValue({
      ok: true,
      content: nightOut,
      published: true,
      sample: true,
    });
    vi.mocked(getHostGuests).mockResolvedValue([]);

    const html = renderToStaticMarkup(
      (await HostPage({ params: Promise.resolve({ slug: "demo" }) })) as ReactElement,
    );

    expect(html).toContain("PARTY_VIEW sample=true preview=true");
  });
});
