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
    expect(screen.getByPlaceholderText(/allergies, vegetarian, no shellfish/i)).toBeTruthy();
    const save = screen.getByRole("button", { name: /^save$/i });
    expect((save as HTMLButtonElement).disabled).toBe(true);
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
});
