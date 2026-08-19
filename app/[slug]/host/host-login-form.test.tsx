/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HostLoginForm } from "@/app/[slug]/host/host-login-form";

describe("HostLoginForm", () => {
  beforeEach(() => {
    cleanup();
  });

  it("wires login errors to the host key field", async () => {
    const user = userEvent.setup();
    render(
      <HostLoginForm loginAction={async () => ({ error: "Wrong host key." })} />,
    );

    await user.type(screen.getByLabelText(/^host key$/i), "nope");
    await user.click(screen.getByRole("button", { name: /^enter$/i }));

    const input = screen.getByLabelText(/^host key$/i);
    const alert = await screen.findByRole("alert");
    expect(alert.id).toBe("host-login-error");
    expect(alert.textContent).toBe("Wrong host key.");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe("host-login-error");
  });
});
