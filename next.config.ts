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
};

export default nextConfig;
