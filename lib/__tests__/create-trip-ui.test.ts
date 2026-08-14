import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CreateTripForm } from "@/components/create-trip-form";
import { LandingView } from "@/components/landing-view";
import { OrganizerPacketView } from "@/components/organizer-packet-view";
import { SiteNav } from "@/components/site-nav";

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark", setTheme: () => {} }),
}));

const ENV_KEYS = ["ADMIN_UI_PASSWORD", "ADMIN_API_TOKEN", "DATABASE_URL"] as const;

function assertNoEnvLeak(html: string) {
  for (const key of ENV_KEYS) {
    expect(html).not.toContain(key);
  }
}

describe("create-from-UI pages", () => {
  it("homepage has a Create a trip CTA to /create", () => {
    const html = renderToStaticMarkup(createElement(LandingView));
    expect(html).toMatch(/Create a trip/);
    expect(html).toMatch(/href="\/create"/);
    assertNoEnvLeak(html);
  });

  it("logged-out nav links to /create", () => {
    const html = renderToStaticMarkup(createElement(SiteNav, {}));
    expect(html).toMatch(/Create a trip/);
    expect(html).toMatch(/href="\/create"/);
    assertNoEnvLeak(html);
  });

  it("create form asks for a trip name and does not mention deploy secrets", () => {
    const html = renderToStaticMarkup(createElement(CreateTripForm));
    expect(html).toMatch(/Trip name/);
    expect(html).toMatch(/Create a trip/);
    expect(html).toMatch(/name="siteName"/);
    assertNoEnvLeak(html);
  });

  it("packet view shows invite URL, guest password, and adminToken", () => {
    const html = renderToStaticMarkup(
      createElement(OrganizerPacketView, {
        packet: {
          url: "https://preview.example/cabin-weekend",
          slug: "cabin-weekend",
          password: "guest-pw",
          adminToken: "party-tok",
        },
      }),
    );
    expect(html).toContain("https://preview.example/cabin-weekend");
    expect(html).toContain("guest-pw");
    expect(html).toContain("party-tok");
    expect(html).toMatch(/Invite URL/i);
    expect(html).toMatch(/Guest password/i);
    expect(html).toMatch(/Admin token/i);
    expect(html).toMatch(/href="\/cabin-weekend"/);
    assertNoEnvLeak(html);
  });
});
