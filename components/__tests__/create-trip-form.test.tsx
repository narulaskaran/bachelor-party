/** @vitest-environment jsdom */

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateTripForm } from "@/components/create-trip-form";
import { OrganizerPacketView } from "@/components/organizer-packet-view";
import type { CreateTripResult, OrganizerPacket } from "@/lib/create-trip";

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

const { openTrip, openHost, push } = vi.hoisted(() => ({
  openTrip: vi.fn(),
  openHost: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));

vi.mock("@/lib/guest-access", () => ({
  openAsGuest: (...args: unknown[]) => openTrip(...args),
}));

vi.mock("@/lib/host-access", () => ({
  openAsHost: (...args: unknown[]) => openHost(...args),
  setScheduleKeyEvent: vi.fn(),
}));

const PACKET: OrganizerPacket = {
  url: "https://preview.example/eabc/host",
  slug: "eabc1234567890ab",
  password: "guest-pw",
  adminToken: "party-tok",
};

const ENV_KEYS = ["ADMIN_UI_PASSWORD", "ADMIN_API_TOKEN"] as const;

function assertNoAdminRequirement(html: string) {
  for (const key of ENV_KEYS) {
    expect(html).not.toContain(key);
  }
  expect(html).not.toContain('href="/admin"');
  expect(html).not.toContain("/admin/login");
}

describe("CreateTripForm", () => {
  beforeEach(() => {
    cleanup();
    sessionStorage.clear();
    push.mockReset();
    openHost.mockReset();
  });

  it("posts notes and the host-picked preset, then lands on the host workspace", async () => {
    const user = userEvent.setup();
    const create = vi.fn<(fields: { siteName: string; plan?: string; preset?: string }) => Promise<CreateTripResult>>(
      async () => ({ ok: true, packet: PACKET }),
    );
    const { container } = render(<CreateTripForm create={create} />);

    assertNoAdminRequirement(container.innerHTML);
    expect(screen.queryByLabelText(/event name/i)).toBeNull();
    expect(screen.queryByLabelText(/start date/i)).toBeNull();
    expect(screen.queryByText(/won.t invent a time, place, or headcount/i)).toBeNull();
    expect(screen.queryByText(/dump what you know/i)).toBeNull();
    expect(document.getElementById("create-trip-facts-hint")).toBeNull();
    expect(document.getElementById("create-trip-hint")).toBeNull();
    expect(container.querySelector("legend")).toBeNull();
    expect(screen.queryByText(/^i.m hosting$/i)).toBeNull();
    const heading = screen.getByRole("heading", { name: /^create an event$/i });
    expect(heading.getAttribute("tabindex")).toBe("-1");
    expect(heading.className).toMatch(/outline-none/);
    expect(heading.className).not.toMatch(/ring-3/);
    expect(screen.getByRole("radio", { name: /party/i })).toBeTruthy();
    expect(screen.getByRole("radio", { name: /group trip/i })).toBeTruthy();
    expect(screen.getByText("Details + RSVP")).toBeTruthy();
    expect(screen.getByText("Adds schedule, lodge, activities, pack")).toBeTruthy();

    const notes = screen.getByLabelText(/^describe your event$/i);
    expect(notes.getAttribute("placeholder")).toBe(
      "Long weekend upstate Friday through Sunday. Cabin if I can find one, hike Saturday.",
    );
    expect(notes.getAttribute("placeholder")).not.toMatch(/Where:/);
    expect(notes.getAttribute("placeholder")).not.toMatch(/When:/);
    expect(notes.getAttribute("data-slot")).toBe("textarea");
    expect(notes.className).toMatch(/placeholder:text-muted-foreground/);
    expect(notes.className).toMatch(/focus-visible:border-ring/);
    expect(notes.className).toMatch(/focus-visible:ring-ring\/50/);
    expect(notes.className).not.toMatch(/focus-visible:ring-2(?:\s|$)/);

    const draft = screen.getByRole("button", { name: /^create draft$/i });
    expect(draft.className).toMatch(/min-h-11/);
    expect(draft.className).toMatch(/self-start/);
    expect(draft.className).toMatch(/w-fit/);
    expect(draft.className).not.toMatch(/(?:^|\s)w-full(?:\s|$)/);

    await user.click(screen.getByRole("radio", { name: /party/i }));
    expect(notes.getAttribute("placeholder")).toBe(
      "Friday drinks at Rita's on 6th around 7. I don't have the exact address yet.",
    );
    await user.type(notes, "Thursday dinner\nRita's");
    await user.click(screen.getByRole("radio", { name: /group trip/i }));
    expect((notes as HTMLTextAreaElement).value).toBe("Thursday dinner\nRita's");
    await user.click(screen.getByRole("radio", { name: /party/i }));
    await user.click(screen.getByRole("button", { name: /^create draft$/i }));

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      siteName: "",
      plan: "Thursday dinner\nRita's",
      preset: "night-out",
    });
    expect(sessionStorage.getItem(`bp-host-key:${PACKET.slug}`)).toBe(PACKET.adminToken);
    expect(openHost).toHaveBeenCalledWith(PACKET.slug, PACKET.adminToken);
    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByText(PACKET.password)).toBeNull();
  });

  it("surfaces create failures without sending the host to /admin", async () => {
    const user = userEvent.setup();
    const create = vi.fn(async () => ({
      ok: false as const,
      error: "Too many trips created just now. Try again in a few minutes.",
    }));
    render(<CreateTripForm create={create} />);

    await user.type(screen.getByLabelText(/^describe your event$/i), "Cabin weekend");
    await user.click(screen.getByRole("button", { name: /^create draft$/i }));

    expect(screen.getByRole("alert").textContent).toMatch(/few minutes/i);
    expect(screen.queryByText("ADMIN_UI_PASSWORD")).toBeNull();
    expect(screen.queryByRole("link", { name: /admin/i })).toBeNull();
  });
});

describe("OrganizerPacketView", () => {
  beforeEach(() => {
    cleanup();
    openTrip.mockReset();
    openHost.mockReset();
  });

  it("shows invite URL, guest password, host key, and copy controls", () => {
    const { container } = render(<OrganizerPacketView packet={PACKET} />);
    expect(container.innerHTML).toContain(PACKET.url);
    expect(container.innerHTML).toContain(PACKET.password);
    expect(container.innerHTML).toContain(PACKET.adminToken);
    expect(screen.getByRole("button", { name: /copy invite url/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /copy guest password/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /copy host key/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /copy admin token/i })).toBeNull();
    expect(screen.getByRole("button", { name: /open as guest/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /text these to the group/i })).toBeTruthy();
    expect(screen.getAllByText(/will not be shown again/i).length).toBeGreaterThan(0);
    expect(container.innerHTML).toMatch(/host key/i);
    expect(container.innerHTML).toContain(
      "Keep this to yourself. Open host tools to edit and publish. We can't show it again.",
    );
    expect(container.innerHTML).not.toContain("Authorizes API edits for this trip only");
    expect(container.innerHTML).not.toContain("Not a site-wide secret");
    expect(container.innerHTML).not.toMatch(/admin token/i);
    expect(container.innerHTML).not.toMatch(/only way to edit/i);
    expect(container.innerHTML).toMatch(/review the extracted facts/i);
    expect(container.innerHTML).toMatch(/pick key events/i);
    expect(screen.getByRole("button", { name: /pick key events/i })).toBeTruthy();
    expect(container.innerHTML).toMatch(
      /Text the invite URL and guest password to the group/,
    );
    expect(container.innerHTML).not.toMatch(/isn.t an in-product editor/i);
    expect(container.innerHTML).not.toMatch(/host key is for the API/i);
    assertNoAdminRequirement(container.innerHTML);
  });

  it("Open as guest submits slug and password so the trip unlocks", async () => {
    const user = userEvent.setup();
    render(<OrganizerPacketView packet={PACKET} openTrip={openTrip} />);

    await user.click(screen.getByRole("button", { name: /open as guest/i }));

    expect(openTrip).toHaveBeenCalledWith(PACKET.slug, "guest-pw");
  });

  it("Pick key events submits slug and host key so host tools unlock", async () => {
    const user = userEvent.setup();
    render(
      <OrganizerPacketView packet={PACKET} openTrip={openTrip} openHost={openHost} />,
    );

    await user.click(screen.getByRole("button", { name: /pick key events/i }));

    expect(openHost).toHaveBeenCalledWith(PACKET.slug, "party-tok");
  });
});
