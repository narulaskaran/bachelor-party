/** @vitest-environment jsdom */

import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HostPartyPreview } from "@/components/host-party-preview";
import { HostPreviewPane } from "@/components/host-preview-pane";
import { PartyChrome } from "@/components/party-chrome";
import { RsvpSectionView } from "@/components/sections/rsvp-view";
import { packingStorageKey } from "@/lib/packing-storage";
import type { PartyContent } from "@/lib/party-types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
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
  }) => <a href={href} {...props}>{children}</a>,
}));

vi.mock("@/lib/rsvp-actions", () => ({
  submitGuestInfo: vi.fn(async () => ({ ok: true })),
  submitSampleGuestInfo: vi.fn(async () => ({
    ok: false,
    error: "Demo mode — this sample trip doesn't save RSVPs.",
  })),
}));

const content: PartyContent = {
  kind: "trip",
  trip: {
    siteName: "Cabin Weekend",
    startDate: "2026-09-04",
    endDate: "2026-09-07",
    location: "Denver",
    airport: "DEN",
  },
  packing: [
    { title: "Government ID" },
    { title: "Layers", note: "Nights drop below 40" },
  ],
  rsvp: {
    heading: "RSVP",
    description: "Yes, maybe, or no — takes one minute.",
  },
};

function liveRsvp(sample = false) {
  return (
    <RsvpSectionView
      sample={sample}
      pollActivities={[]}
      extras={{ flights: false, food: false, votes: false, notes: false }}
    />
  );
}

describe("host preview pack and RSVP are static", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("HostPartyPreview has no pack checkbox and no RSVP text/radio/save controls", () => {
    const { container } = render(
      <HostPartyPreview content={content} slug="cabin-weekend" />,
    );

    expect(container.querySelector("#pack")).toBeTruthy();
    expect(container.querySelector("#pack [data-slot=checkbox]")).toBeNull();
    expect(container.querySelector("#pack input")).toBeNull();
    expect(screen.getByText("Government ID")).toBeTruthy();
    expect(screen.getByText("Nights drop below 40")).toBeTruthy();

    expect(container.querySelector("#rsvp")).toBeTruthy();
    expect(container.querySelector("[data-rsvp-preview-static]")).toBeTruthy();
    expect(container.querySelector("#rsvp form")).toBeNull();
    expect(container.querySelector("#rsvp input")).toBeNull();
    expect(container.querySelector("#rsvp textarea")).toBeNull();
    expect(container.querySelector("#rsvp button")).toBeNull();
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.queryByRole("button", { name: /^save$/i })).toBeNull();
    expect(screen.getByRole("heading", { name: /^rsvp$/i })).toBeTruthy();
    expect(screen.getByText(/who.?s coming/i)).toBeTruthy();
  });

  it("clicking host preview pack copy does not persist a check", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <HostPreviewPane
        draftContent={content}
        published={false}
        dirty={false}
        slug="cabin-weekend"
        source="draft"
        onSourceChange={() => {}}
      />,
    );

    expect(container.querySelector("#pack [data-slot=checkbox]")).toBeNull();
    const title = [...container.querySelectorAll("#pack span")].find(
      (node) => node.textContent === "Government ID",
    );
    expect(title).toBeTruthy();
    await user.click(title!);
    expect(window.localStorage.getItem(packingStorageKey("cabin-weekend"))).toBeNull();
  });

  it("live guest page still has interactive pack and RSVP", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <PartyChrome content={content} slug="cabin-weekend" rsvp={liveRsvp()} />,
    );

    const checkbox = screen.getByRole("checkbox", { name: /government id/i });
    expect(checkbox).toBeTruthy();
    expect(container.querySelector('#rsvp input[name="name"]')).toBeTruthy();
    expect(container.querySelector('#rsvp input[type="radio"]')).toBeTruthy();
    expect(screen.getByRole("button", { name: /^save$/i })).toBeTruthy();

    await user.click(checkbox);
    expect(window.localStorage.getItem(packingStorageKey("cabin-weekend"))).toBe(
      '{"Government ID":true}',
    );
  });

  it("real /demo guest page still has interactive pack and RSVP", () => {
    const { container } = render(
      <PartyChrome content={content} slug="demo" rsvp={liveRsvp(true)} />,
    );

    expect(screen.getByRole("checkbox", { name: /government id/i })).toBeTruthy();
    expect(container.querySelector('#rsvp input[name="name"]')).toBeTruthy();
    expect(container.querySelector('#rsvp input[type="radio"]')).toBeTruthy();
    expect(screen.getByRole("button", { name: /^save$/i })).toBeTruthy();
  });
});
