/** @vitest-environment jsdom */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act, createElement } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { PackingSection } from "@/components/sections/packing";
import { packingStorageKey } from "@/lib/packing-storage";

const items = [
  { title: "Government ID" },
  { title: "Layers", note: "Nights drop below 40" },
];

describe("PackingSection", () => {
  beforeEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("renders titled items with 44px tap rows and hides blank titles", () => {
    const { container } = render(
      <PackingSection
        slug="demo"
        packing={[...items, { title: "   " }]}
      />,
    );
    expect(container.querySelector("#pack")).toBeTruthy();
    expect(screen.getByText("Pack")).toBeTruthy();
    expect(screen.getByText("Don't forget these.")).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: /government id/i })).toBeTruthy();
    expect(screen.getByText("Nights drop below 40")).toBeTruthy();
    expect(container.querySelectorAll("[class*='min-h-11']").length).toBeGreaterThan(0);
  });

  it("left-aligns title and note immediately after the checkbox", () => {
    const { container } = render(<PackingSection slug="demo" packing={items} />);
    const labels = container.querySelectorAll("[data-slot=label]");
    expect(labels.length).toBe(items.length);
    for (const label of labels) {
      expect(label.className).toMatch(/items-start/);
      expect(label.className).toMatch(/text-left/);
      expect(label.className).toMatch(/min-h-11/);
      expect(label.className).not.toMatch(/items-center/);
    }
  });

  it("checks, unchecks, and persists immediately per trip slug", async () => {
    const user = userEvent.setup();
    render(<PackingSection slug="demo" packing={items} />);

    await user.click(screen.getByRole("checkbox", { name: /government id/i }));
    expect(window.localStorage.getItem(packingStorageKey("demo"))).toBe(
      '{"Government ID":true}',
    );
    expect(window.localStorage.getItem(packingStorageKey("cabin"))).toBeNull();

    await user.click(screen.getByRole("checkbox", { name: /government id/i }));
    expect(window.localStorage.getItem(packingStorageKey("demo"))).toBe("{}");
  });

  it("restores checks for this slug after a remount", async () => {
    window.localStorage.setItem(packingStorageKey("demo"), '{"Layers":true}');
    render(<PackingSection slug="demo" packing={items} />);

    expect(screen.getByRole("checkbox", { name: /layers/i }).getAttribute("aria-checked")).toBe(
      "false",
    );
    await waitFor(() =>
      expect(screen.getByRole("checkbox", { name: /layers/i }).getAttribute("aria-checked")).toBe(
        "true",
      ),
    );
    expect(screen.getByRole("checkbox", { name: /government id/i }).getAttribute("aria-checked")).toBe(
      "false",
    );
  });

  it("hydrates persisted checks without a checkbox mismatch", async () => {
    window.localStorage.setItem(packingStorageKey("demo"), '{"Government ID":true}');
    const html = renderToString(
      createElement(PackingSection, { slug: "demo", packing: items }),
    );
    expect(html).toContain('aria-checked="false"');
    expect(html).not.toContain('aria-checked="true"');

    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);

    const recoverable: unknown[] = [];
    const onRecoverableError = vi.fn((error: unknown) => {
      recoverable.push(error);
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(container, createElement(PackingSection, { slug: "demo", packing: items }), {
        onRecoverableError,
      });
    });

    await waitFor(() =>
      expect(
        container.querySelector('[id="pack-0"]')?.getAttribute("aria-checked"),
      ).toBe("true"),
    );
    expect(
      container.querySelector('[id="pack-1"]')?.getAttribute("aria-checked"),
    ).toBe("false");

    const hydrationNoise = [...recoverable, ...consoleError.mock.calls.flat()]
      .map((entry) => String(entry))
      .filter((text) => /hydrat/i.test(text));
    expect(hydrationNoise).toEqual([]);

    await act(async () => {
      root?.unmount();
    });
    container.remove();
    consoleError.mockRestore();
  });
});
