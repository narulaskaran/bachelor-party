/** @vitest-environment jsdom */

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RsvpForm } from "@/components/rsvp-form";
import { DEMO_RSVP_MESSAGE } from "@/lib/demo-party";
import { submitGuestInfo, submitSampleGuestInfo } from "@/lib/rsvp-actions";

const { mockRefresh } = vi.hoisted(() => ({ mockRefresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
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

vi.mock("sonner", () => ({
  toast: { success: vi.fn() },
}));

vi.mock("@/lib/rsvp-actions", () => ({
  submitGuestInfo: vi.fn(async () => ({ ok: true })),
  submitSampleGuestInfo: vi.fn(async () => ({
    ok: false,
    error: "Demo mode — this sample trip doesn't save RSVPs.",
  })),
}));

describe("RsvpForm", () => {
  beforeEach(() => {
    cleanup();
    mockRefresh.mockClear();
    vi.mocked(submitGuestInfo).mockClear();
    vi.mocked(submitSampleGuestInfo).mockClear();
  });

  it("sample trip shows a demo banner before fill and does not submit", async () => {
    const user = userEvent.setup();
    render(
      <RsvpForm
        sample
        pollActivities={[{ slug: "bonus", name: "Bonus round" }]}
        airport="DEN"
      />,
    );

    expect(screen.getByRole("alert").textContent).toBe(DEMO_RSVP_MESSAGE);
    expect(screen.queryByPlaceholderText(/allergies, vegetarian, no shellfish/i)).toBeNull();
    const save = screen.getByRole("button", { name: /^save$/i });
    expect((save as HTMLButtonElement).disabled).toBe(true);
    expect(save.className).toMatch(/min-h-11/);
    expect(save.className).toMatch(/disabled:bg-muted/);
    expect(save.className).toMatch(/disabled:text-muted-foreground/);
    expect(save.className).toMatch(/disabled:opacity-100/);
    expect(
      screen.getByRole("link", { name: /create your own trip to collect RSVPs/i }).getAttribute("href"),
    ).toBe("/#create");

    await user.type(screen.getByLabelText(/^name$/i), "Alex");
    await user.click(save);

    const form = save.closest("form");
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    expect(submitSampleGuestInfo).not.toHaveBeenCalled();
    expect(submitGuestInfo).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe(DEMO_RSVP_MESSAGE);
  });

  it("real trip has a live Save and no demo banner", () => {
    render(<RsvpForm pollActivities={[]} />);

    expect(screen.queryByText(DEMO_RSVP_MESSAGE)).toBeNull();
    expect(screen.getByText(/name and attendance are required/i)).toBeTruthy();
    expect(document.querySelector('label[for="name"]')?.className).toContain("after:content");
    expect(screen.getByText("Attendance", { selector: "span" }).className).toContain("after:content");
    const save = screen.getByRole("button", { name: /^save$/i });
    expect((save as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByRole("link", { name: /create your own trip to collect RSVPs/i })).toBeNull();
  });

  it("explains that every flight field is optional for drivers", () => {
    render(<RsvpForm airport="DEN" pollActivities={[]} extras={{ flights: true, food: false, votes: false, notes: false }} />);

    expect(screen.getByText(/flight details are optional/i).textContent).toMatch(/leave all four fields blank/i);
    expect(screen.getByLabelText(/arrival flight \(optional\)/i)).toBeTruthy();
    expect(screen.getByLabelText(/arrival time \(optional\)/i)).toBeTruthy();
    expect(screen.getByLabelText(/departure flight \(optional\)/i)).toBeTruthy();
    expect(screen.getByLabelText(/departure time \(optional\)/i)).toBeTruthy();
  });

  it("host preview has no RSVP fields or Save and does not show demo copy", () => {
    const { container } = render(<RsvpForm preview pollActivities={[]} extras={{ flights: true, food: true, votes: true, notes: true }} airport="DEN" />);

    expect(screen.queryByText(DEMO_RSVP_MESSAGE)).toBeNull();
    expect(screen.queryByRole("link", { name: /create your own trip to collect RSVPs/i })).toBeNull();
    expect(container.querySelector("form")).toBeNull();
    expect(container.querySelector("input")).toBeNull();
    expect(container.querySelector("textarea")).toBeNull();
    expect(container.querySelector("button")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.queryByRole("button", { name: /^save$/i })).toBeNull();
    expect(submitSampleGuestInfo).not.toHaveBeenCalled();
    expect(submitGuestInfo).not.toHaveBeenCalled();
  });

  it("shows explicit attendance and plus-one controls without exposing other guest details", () => {
    render(
      <RsvpForm
        pollActivities={[]}
        rsvpConfig={{ plusOnePolicy: "allowed", maxPartySize: 4 }}
        existing={{
          name: "Alex",
          nameKey: "alex",
          phone: null,
          arrivalFlight: null,
          arrivalTime: null,
          departureFlight: null,
          departureTime: null,
          dietary: null,
          notes: null,
          activityPrefs: {},
          attendanceStatus: "maybe",
          partySize: 2,
          plusOneName: "Taylor",
        }}
      />,
    );

    expect(screen.getByRole("group", { name: /attendance/i })).toBeTruthy();
    expect(screen.getByLabelText("Yes")).toBeTruthy();
    expect(screen.getByLabelText("Maybe")).toBeTruthy();
    expect(screen.getByLabelText("No")).toBeTruthy();
    expect(screen.queryByLabelText(/plus-one name/i)).toBeNull();
    fireEvent.click(screen.getByLabelText("Yes"));
    expect((screen.getByLabelText(/plus-one name/i) as HTMLInputElement).value).toBe("Taylor");
  });

  it("prefills plus-one name on reload when Yes is already selected", () => {
    render(
      <RsvpForm
        pollActivities={[]}
        rsvpConfig={{ plusOnePolicy: "allowed", maxPartySize: 4 }}
        existing={{
          name: "Alex",
          nameKey: "alex",
          phone: null,
          arrivalFlight: null,
          arrivalTime: null,
          departureFlight: null,
          departureTime: null,
          dietary: null,
          notes: null,
          activityPrefs: {},
          attendanceStatus: "attending",
          partySize: 2,
          plusOneName: "Taylor",
        }}
      />,
    );

    expect((screen.getByLabelText("Yes") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText(/^name$/i) as HTMLInputElement).value).toBe("Alex");
    expect((screen.getByLabelText(/plus-one name/i) as HTMLInputElement).value).toBe("Taylor");
  });

  it("scopes the RSVP submit to this event's invite token", () => {
    const invite = "f".repeat(32);
    render(<RsvpForm pollActivities={[]} inviteToken={invite} />);
    expect((document.querySelector('input[name="invite"]') as HTMLInputElement).value).toBe(invite);
  });

  it("keeps Saved confirmation after refresh remounts a No RSVP", async () => {
    const user = userEvent.setup();
    render(<RsvpForm pollActivities={[]} />);

    await user.type(screen.getByLabelText(/^name$/i), "Alex");
    await user.click(screen.getByLabelText("No"));
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(screen.getByRole("button", { name: /^saved$/i })).toBeTruthy());
    expect(screen.getByRole("alert").textContent).toMatch(/on the board/i);
    expect(mockRefresh).toHaveBeenCalled();

    cleanup();
    render(
      <RsvpForm
        pollActivities={[]}
        existing={{
          name: "Alex",
          nameKey: "alex",
          phone: null,
          arrivalFlight: null,
          arrivalTime: null,
          departureFlight: null,
          departureTime: null,
          dietary: null,
          notes: null,
          activityPrefs: {},
          attendanceStatus: "not-attending",
          partySize: 1,
          plusOneName: null,
        }}
      />,
    );

    expect(screen.getByRole("button", { name: /^saved$/i })).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toMatch(/on the board/i);
    expect((screen.getByLabelText("No") as HTMLInputElement).checked).toBe(true);
  });
});
