import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // Old multi-page URLs → single-page anchors.
    return [
      { source: "/schedule", destination: "/#schedule", permanent: false },
      { source: "/activities", destination: "/#activities", permanent: false },
      { source: "/basecamp", destination: "/#basecamp", permanent: false },
      { source: "/rsvp", destination: "/#rsvp", permanent: false },
    ];
  },
  async rewrites() {
    // /parties is an alias, not a second set of route files. Dual-mounting
    // trips + parties as App Router routes blew the Hobby 12-function cap
    // (Vercel Preview failed; GitHub CI has no such cap).
    return [
      { source: "/api/admin/parties", destination: "/api/admin/trips" },
      { source: "/api/admin/parties/:path*", destination: "/api/admin/trips/:path*" },
      { source: "/api/openapi.json", destination: "/api/openapi" },
    ];
  },
};

export default nextConfig;
