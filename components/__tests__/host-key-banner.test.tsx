/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HostKeyBanner } from "@/components/host-key-banner";
import { hostKeyBannerHiddenKey, hostKeyStorageKey, rememberHostKey } from "@/lib/host-key-storage";

const SLUG = "friday-drinks";
const HOST_KEY = "party-tok";

describe("HostKeyBanner", () => {
  const writeText = vi.fn(async () => undefined);

  beforeEach(() => {
    sessionStorage.clear();
    rememberHostKey(SLUG, HOST_KEY);
    writeText.mockClear();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
  });

  it("copies the host key without clearing the tab session", async () => {
    render(<HostKeyBanner slug={SLUG} />);

    fireEvent.click(screen.getByRole("button", { name: /copy host key/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(HOST_KEY));
    expect(sessionStorage.getItem(hostKeyStorageKey(SLUG))).toBe(HOST_KEY);
    expect(screen.getByText(HOST_KEY)).toBeTruthy();
    expect(screen.getByRole("button", { name: /copied/i })).toBeTruthy();
  });

  it("hides the banner without deleting the stored host key", () => {
    render(<HostKeyBanner slug={SLUG} />);

    fireEvent.click(screen.getByRole("button", { name: /^hide$/i }));

    expect(screen.queryByRole("button", { name: /copy host key/i })).toBeNull();
    expect(screen.getByRole("button", { name: /show host key/i })).toBeTruthy();
    expect(sessionStorage.getItem(hostKeyStorageKey(SLUG))).toBe(HOST_KEY);
    expect(sessionStorage.getItem(hostKeyBannerHiddenKey(SLUG))).toBe("1");
  });

  it("keeps the key hidden after remount until Show host key", () => {
    render(<HostKeyBanner slug={SLUG} />);
    fireEvent.click(screen.getByRole("button", { name: /^hide$/i }));
    cleanup();
    render(<HostKeyBanner slug={SLUG} />);

    expect(screen.queryByText(HOST_KEY)).toBeNull();
    expect(screen.getByRole("button", { name: /show host key/i })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /show host key/i }));
    expect(screen.getByText(HOST_KEY)).toBeTruthy();
    expect(sessionStorage.getItem(hostKeyStorageKey(SLUG))).toBe(HOST_KEY);
  });
});
