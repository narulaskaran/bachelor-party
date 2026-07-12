"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { TRIP } from "@/lib/party";

const links = [
  { href: "/", label: "Overview" },
  { href: "/schedule", label: "Schedule" },
  { href: "/activities", label: "Activities" },
  { href: "/basecamp", label: "Basecamp" },
  { href: "/rsvp", label: "Your Info" },
];

export function SiteNav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/"
          className="shrink-0 whitespace-nowrap font-display text-lg font-bold uppercase tracking-wide"
        >
          <span className="sm:hidden">HLR</span>
          <span className="hidden sm:inline">{TRIP.groomName}&rsquo;s Last Ride</span>
          <span className="ml-2 hidden text-xs font-normal normal-case tracking-normal text-muted-foreground sm:inline">
            {TRIP.dateLabel}
          </span>
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
