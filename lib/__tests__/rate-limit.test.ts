import { describe, it, expect, afterEach } from "vitest";
import {
  CREATE_RATE_LIMIT,
  clientIp,
  consumeRateLimit,
  createRateLimitKey,
  rateLimitCreate,
  resetRateLimitStore,
} from "../rate-limit";

describe("rate limit", () => {
  afterEach(() => {
    resetRateLimitStore();
  });

  it("allows up to the limit then denies with retryAfterSec", () => {
    const opts = { limit: 3, windowMs: 60_000 };
    expect(consumeRateLimit("k", opts).ok).toBe(true);
    expect(consumeRateLimit("k", opts).ok).toBe(true);
    expect(consumeRateLimit("k", opts).ok).toBe(true);
    const denied = consumeRateLimit("k", opts);
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.retryAfterSec).toBeGreaterThan(0);
  });

  it("isolates keys", () => {
    const opts = { limit: 1, windowMs: 60_000 };
    expect(consumeRateLimit("a", opts).ok).toBe(true);
    expect(consumeRateLimit("b", opts).ok).toBe(true);
    expect(consumeRateLimit("a", opts).ok).toBe(false);
  });

  it("clientIp uses the first x-forwarded-for hop", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.1.1.1, 2.2.2.2" },
    });
    expect(clientIp(req)).toBe("1.1.1.1");
  });

  it("clientIp falls back to x-real-ip then unknown", () => {
    expect(
      clientIp(new Request("http://localhost", { headers: { "x-real-ip": "9.9.9.9" } })),
    ).toBe("9.9.9.9");
    expect(clientIp(new Request("http://localhost"))).toBe("unknown");
  });

  it("rateLimitCreate returns 429 with Retry-After after the create budget is spent", () => {
    const ip = "203.0.113.8";
    const key = createRateLimitKey(ip);
    for (let i = 0; i < CREATE_RATE_LIMIT.limit; i++) {
      expect(consumeRateLimit(key, CREATE_RATE_LIMIT).ok).toBe(true);
    }
    const res = rateLimitCreate(
      new Request("http://localhost/api/admin/trips", {
        method: "POST",
        headers: { "x-forwarded-for": ip },
      }),
    );
    expect(res).not.toBeNull();
    expect(res!.status).toBe(429);
    expect(res!.headers.get("Retry-After")).toBeTruthy();
  });
});
