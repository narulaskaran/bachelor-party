/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { InitialHashFocus } from "@/components/initial-hash-focus";

const scrollIntoView = vi.fn();
const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;

function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
}

function setScrollY(scrollY: number) {
  Object.defineProperty(window, "scrollY", { configurable: true, value: scrollY });
}

function addMeasuredTarget() {
  const target = document.createElement("section");
  target.id = "rsvp";
  const absoluteTop = 1227;
  const targetHeight = 180;
  vi.spyOn(target, "getBoundingClientRect").mockImplementation(
    () => new DOMRect(0, absoluteTop - window.scrollY, 320, targetHeight),
  );
  document.body.append(target);
  return target;
}

function expectVisible(target: HTMLElement, height: number) {
  const rect = target.getBoundingClientRect();
  expect(rect.top, `target top at ${window.innerWidth}x${height}`).toBeGreaterThanOrEqual(0);
  expect(rect.bottom, `target bottom at ${window.innerWidth}x${height}`).toBeLessThanOrEqual(height);
}

describe("InitialHashFocus", () => {
  beforeEach(() => {
    cleanup();
    document.body.replaceChildren();
    window.history.replaceState(null, "", "/demo/host#rsvp");
    setViewport(1024, 768);
    setScrollY(0);
    scrollIntoView.mockReset();
    scrollIntoView.mockImplementation(() => setScrollY(1203));
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
  });

  afterEach(() => {
    cleanup();
    document.documentElement.style.removeProperty("scroll-behavior");
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each([
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ])("repairs direct #rsvp entry at $width x $height", ({ width, height }) => {
    setViewport(width, height);
    const target = addMeasuredTarget();
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });

    render(<InitialHashFocus targetId="rsvp"><div /></InitialHashFocus>);

    expect(document.activeElement).not.toBe(target);
    expect(scrollIntoView).not.toHaveBeenCalled();
    while (frames.length > 0) frames.shift()?.(0);

    expect(window.location.hash).toBe("#rsvp");
    expect(document.activeElement).toBe(target);
    expectVisible(target, height);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("leaves other direct hashes to native browser behavior", () => {
    window.history.replaceState(null, "", "/demo/host#schedule");
    const target = addMeasuredTarget();
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });

    render(<InitialHashFocus targetId="rsvp"><div /></InitialHashFocus>);
    while (frames.length > 0) frames.shift()?.(0);

    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(target);
  });
});
