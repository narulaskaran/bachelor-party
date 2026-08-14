import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import type { VisibleSections } from "@/lib/trip-sections";

const allLinks: { href: string; label: string; section: keyof VisibleSections }[] = [
  { href: "#schedule", label: "Schedule", section: "schedule" },
  { href: "#activities", label: "Activities", section: "activities" },
  { href: "#basecamp", label: "Basecamp", section: "lodging" },
  { href: "#rsvp", label: "Your Info", section: "rsvp" },
];

export function SiteNav({
  siteName,
  dateLabel,
  slug,
  sections,
}: {
  siteName?: string;
  dateLabel?: string;
  slug?: string;
  sections?: VisibleSections;
}) {
  const homeHref = slug ? `/${slug}` : "/";
  const links = (sections ? allLinks.filter((link) => sections[link.section]) : allLinks).map(
    (link) => ({ ...link, href: `${homeHref}${link.href}` }),
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href={homeHref}
          className="shrink-0 whitespace-nowrap font-display text-lg font-bold uppercase tracking-wide"
        >
          <span className="sm:hidden">The Big Send</span>
          <span className="hidden sm:inline">{siteName ?? "The Big Send"}</span>
          {dateLabel && (
            <span className="ml-2 hidden text-xs font-normal normal-case tracking-normal text-muted-foreground sm:inline">
              {dateLabel}
            </span>
          )}
        </Link>
        <div className="flex items-center gap-1">
          {siteName && (
            <nav className="flex items-center gap-1 overflow-x-auto">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
