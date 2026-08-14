import { NextResponse } from "next/server";

// In-memory sliding window. Good enough to keep unauthenticated create
// from being a trivial spam hole; each serverless instance has its own map.

export type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

export const CREATE_RATE_LIMIT: RateLimitOptions = {
  limit: 10,
  windowMs: 15 * 60 * 1000,
};

const hits = new Map<string, number[]>();

export function resetRateLimitStore() {
  hits.clear();
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}

export function createRateLimitKey(ip: string): string {
  return `create:${ip}`;
}

export function consumeRateLimit(
  key: string,
  options: RateLimitOptions,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const windowStart = now - options.windowMs;
  const timestamps = (hits.get(key) ?? []).filter((t) => t > windowStart);
  if (timestamps.length >= options.limit) {
    hits.set(key, timestamps);
    const oldest = timestamps[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + options.windowMs - now) / 1000));
    return { ok: false, retryAfterSec };
  }
  timestamps.push(now);
  hits.set(key, timestamps);
  return { ok: true };
}

export function rateLimitCreate(request: Request): NextResponse | null {
  const result = consumeRateLimit(createRateLimitKey(clientIp(request)), CREATE_RATE_LIMIT);
  if (result.ok) return null;
  return NextResponse.json(
    { error: "Too many trips created from this IP. Try again later." },
    {
      status: 429,
      headers: { "Retry-After": String(result.retryAfterSec) },
    },
  );
}
