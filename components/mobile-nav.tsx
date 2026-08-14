import Link from "next/link";
import { Menu, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type MobileNavLink = { href: string; label: string };

export function MobileNav({ links }: { links: MobileNavLink[] }) {
  return (
    <details className="group md:hidden">
      <summary
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
        )}
        aria-label="Open menu"
      >
        <Menu className="size-4 group-open:hidden" aria-hidden />
        <X className="hidden size-4 group-open:block" aria-hidden />
        <span className="sr-only">Menu</span>
      </summary>
      <nav
        aria-label="Trip sections"
        className="absolute inset-x-0 top-full border-b border-border bg-background/95 px-4 py-3 shadow-md backdrop-blur"
      >
        <ul className="mx-auto flex max-w-5xl flex-col">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </details>
  );
}
