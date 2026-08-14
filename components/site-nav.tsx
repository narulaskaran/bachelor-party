import Link from "next/link";
import { MobileNav } from "@/components/mobile-nav";
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
    (link) => ({ href: `${homeHref}${link.href}`, label: link.label }),
  );

  return (
    <header className="sticky top-0 z-50 min-w-0 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full min-w-0 max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link
          href={homeHref}
          className="min-w-0 truncate font-display text-lg font-bold uppercase tracking-wide"
        >
          <span className="md:hidden">The Big Send</span>
          <span className="hidden md:inline">{siteName ?? "The Big Send"}</span>
          {dateLabel && (
            <span className="ml-2 hidden text-xs font-normal normal-case tracking-normal text-muted-foreground lg:inline">
              {dateLabel}
            </span>
          )}
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          {siteName && (
            <>
              <nav className="hidden items-center gap-1 md:flex" aria-label="Trip sections">
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
              <MobileNav links={links} />
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
