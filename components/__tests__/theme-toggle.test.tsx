/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ThemeToggle } from "@/components/theme-toggle";

const setTheme = vi.fn();

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark", setTheme }),
}));

describe("ThemeToggle", () => {
  afterEach(() => cleanup());

  it("exposes the current theme as pressed state and label", () => {
    render(<ThemeToggle />);
    const toggle = screen.getByRole("button", { name: /dark theme/i });
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(toggle.getAttribute("aria-label")).toBe("Dark theme");
  });
});
