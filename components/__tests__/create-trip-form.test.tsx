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

const PACKET: OrganizerPacket = {
  url: "https://preview.example/cabin-weekend",
  slug: "cabin-weekend",
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
  });

  it("posts the form to unauthenticated create with name and optional dates", async () => {
    const user = userEvent.setup();
    const create = vi.fn<(fields: { siteName: string; startDate?: string; endDate?: string }) => Promise<CreateTripResult>>(
      async () => ({ ok: true, packet: PACKET }),
    );
    const { container } = render(<CreateTripForm create={create} />);

    assertNoAdminRequirement(container.innerHTML);
    expect(screen.getByLabelText(/trip name/i)).toBeTruthy();
    expect(screen.getByLabelText(/start date/i)).toBeTruthy();
    expect(screen.getByLabelText(/end date/i)).toBeTruthy();

    await user.type(screen.getByLabelText(/trip name/i), "Cabin Weekend");
    await user.type(screen.getByLabelText(/start date/i), "2026-09-04");
    await user.type(screen.getByLabelText(/end date/i), "2026-09-07");
    await user.click(screen.getByRole("button", { name: /^create a trip$/i }));

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      siteName: "Cabin Weekend",
      startDate: "2026-09-04",
      endDate: "2026-09-07",
    });
  });

  it("renders packet fields once with copy controls, then drops them on create another", async () => {
    const user = userEvent.setup();
    const create = vi.fn(async () => ({ ok: true as const, packet: PACKET }));
    render(<CreateTripForm create={create} />);

    await user.type(screen.getByLabelText(/trip name/i), "Cabin Weekend");
    await user.click(screen.getByRole("button", { name: /^create a trip$/i }));

    expect(screen.getByText(PACKET.url)).toBeTruthy();
    expect(screen.getByText(PACKET.password)).toBeTruthy();
    expect(screen.getByText(PACKET.adminToken)).toBeTruthy();
    expect(screen.getAllByText(/will not be shown again/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /open the trip/i }).getAttribute("href")).toBe(
      "/cabin-weekend",
    );
    expect(screen.getByRole("button", { name: /copy invite url/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /copy guest password/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /copy admin token/i })).toBeTruthy();
    expect(screen.queryByLabelText(/trip name/i)).toBeNull();
    expect(screen.queryByText("ADMIN_UI_PASSWORD")).toBeNull();

    await user.click(screen.getByRole("button", { name: /create another/i }));

    expect(screen.queryByText(PACKET.url)).toBeNull();
    expect(screen.queryByText(PACKET.adminToken)).toBeNull();
    expect(screen.getByLabelText(/trip name/i)).toBeTruthy();
  });

  it("surfaces create failures without sending the host to /admin", async () => {
    const user = userEvent.setup();
    const create = vi.fn(async () => ({
      ok: false as const,
      error: "Too many trips created just now. Try again in a few minutes.",
    }));
    render(<CreateTripForm create={create} />);

    await user.type(screen.getByLabelText(/trip name/i), "Cabin Weekend");
    await user.click(screen.getByRole("button", { name: /^create a trip$/i }));

    expect(screen.getByRole("alert").textContent).toMatch(/few minutes/i);
    expect(screen.queryByText("ADMIN_UI_PASSWORD")).toBeNull();
    expect(screen.queryByRole("link", { name: /admin/i })).toBeNull();
  });
});

describe("OrganizerPacketView", () => {
  it("shows invite URL, guest password, admin token, and copy controls", () => {
    const { container } = render(<OrganizerPacketView packet={PACKET} />);
    expect(container.innerHTML).toContain(PACKET.url);
    expect(container.innerHTML).toContain(PACKET.password);
    expect(container.innerHTML).toContain(PACKET.adminToken);
    expect(screen.getByRole("button", { name: /copy invite url/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /copy guest password/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /copy admin token/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /open the trip/i }).getAttribute("href")).toBe(
      "/cabin-weekend",
    );
    assertNoAdminRequirement(container.innerHTML);
  });
});
