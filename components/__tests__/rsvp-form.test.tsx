/** @vitest-environment jsdom */

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RsvpForm } from "@/components/rsvp-form";
import { DEMO_RSVP_MESSAGE } from "@/lib/demo-party";
import { submitGuestInfo, submitSampleGuestInfo } from "@/lib/rsvp-actions";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
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
    const save = screen.getByRole("button", { name: /^save$/i });
    expect((save as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByRole("link", { name: /create your own trip to collect RSVPs/i })).toBeNull();
  });

  it("host preview looks like a real RSVP and does not show demo copy", async () => {
    const user = userEvent.setup();
    render(<RsvpForm preview pollActivities={[]} />);

    expect(screen.queryByText(DEMO_RSVP_MESSAGE)).toBeNull();
    expect(screen.queryByRole("link", { name: /create your own trip to collect RSVPs/i })).toBeNull();
    const save = screen.getByRole("button", { name: /^save$/i });
    expect((save as HTMLButtonElement).disabled).toBe(false);

    await user.type(screen.getByLabelText(/^name$/i), "Alex");
    await user.click(save);
    const form = save.closest("form");
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

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
});
