// Security headers for the admin HTML surface (/admin, /admin/login).
// Kept off public marketing/trip pages: a site-wide CSP can break those,
// while clickjacking + nosniff belong on the password form and dashboard.

export const ADMIN_HTML_HEADER_SOURCE = "/admin/:path*";

export const ADMIN_HTML_SECURITY_HEADERS: { key: string; value: string }[] = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  {
    key: "Content-Security-Policy",
    // No default-src: Next.js, next-themes, and Vercel Analytics inject
    // scripts/styles we don't nonce. Restrict what a password form needs.
    value: [
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
    ].join("; "),
  },
  { key: "Referrer-Policy", value: "no-referrer" },
];

export function isAdminHtmlPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function applyAdminHtmlSecurityHeaders(headers: Headers): void {
  for (const { key, value } of ADMIN_HTML_SECURITY_HEADERS) {
    headers.set(key, value);
  }
}

/** Middleware-style helper: extra response headers for this request, or null. */
export function adminHtmlSecurityHeadersFor(request: Request): Headers | null {
  const pathname = new URL(request.url).pathname;
  if (!isAdminHtmlPath(pathname)) return null;
  const headers = new Headers();
  applyAdminHtmlSecurityHeaders(headers);
  return headers;
}

export function adminHtmlHeaderRules(): {
  source: string;
  headers: { key: string; value: string }[];
}[] {
  return [
    {
      source: ADMIN_HTML_HEADER_SOURCE,
      headers: ADMIN_HTML_SECURITY_HEADERS,
    },
  ];
}
