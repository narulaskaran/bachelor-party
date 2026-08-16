/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PartyLoginForm } from "@/app/[slug]/party-login-form";

describe("PartyLoginForm", () => {
  beforeEach(() => {
    cleanup();
  });

  it("wires login errors to the password field", async () => {
    const user = userEvent.setup();
    render(
      <PartyLoginForm loginAction={async () => ({ error: "Wrong password." })} />,
    );

    await user.type(screen.getByLabelText(/^password$/i), "nope");
    await user.click(screen.getByRole("button", { name: /^enter$/i }));

    const input = screen.getByLabelText(/^password$/i);
    const alert = await screen.findByRole("alert");
    expect(alert.id).toBe("party-login-error");
    expect(alert.textContent).toBe("Wrong password.");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe("party-login-error");
  });
});
