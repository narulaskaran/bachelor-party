"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { landingPanelHash, type LandingPanel } from "@/lib/landing-panel";

/** Same-page `/#create` (or `/#enter`) that reveals the landing panel without a remount. */
export function LandingPanelLink({
  panel,
  onClick,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & { panel: LandingPanel }) {
  const href = `/${landingPanelHash(panel)}`;

  return (
    <Link
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (window.location.pathname !== "/") return;
        event.preventDefault();
        if (window.location.hash !== landingPanelHash(panel)) {
          history.pushState(null, "", href);
        }
        window.dispatchEvent(new Event("hashchange"));
      }}
      {...props}
    />
  );
}
