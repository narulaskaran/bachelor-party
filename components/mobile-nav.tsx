"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { HashFocusLink } from "@/components/hash-focus-link";
import { cn } from "@/lib/utils";

export type MobileNavLink = { href: `#${string}`; label: string; focusId: string };

export function MobileNav({ links }: { links: MobileNavLink[] }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);

  function closeMenu() {
    detailsRef.current?.removeAttribute("open");
    setOpen(false);
  }

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const details = detailsRef.current;
      if (!details?.open) return;
      if (details.contains(event.target as Node)) return;
      details.removeAttribute("open");
      setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <details
      ref={detailsRef}
      className="group md:hidden"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
        )}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
      >
        <Menu className="size-4 group-open:hidden" aria-hidden />
        <X className="hidden size-4 group-open:block" aria-hidden />
      </summary>
      <div className="absolute inset-x-0 top-full bg-background">
        <nav
          aria-label="Trip sections"
          className="border-b border-border bg-background px-4 py-3 shadow-md"
        >
          <ul className="mx-auto flex max-w-5xl flex-col">
            {links.map((link) => (
              <li key={link.href}>
                <HashFocusLink
                  href={link.href}
                  focusId={link.focusId}
                  deferFocus
                  className="block min-h-11 rounded-md px-3 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={closeMenu}
                >
                  {link.label}
                </HashFocusLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </details>
  );
}
