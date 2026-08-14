"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type MobileNavLink = { href: string; label: string };

export function MobileNav({ links }: { links: MobileNavLink[] }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function closeMenu() {
    detailsRef.current?.removeAttribute("open");
  }

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const details = detailsRef.current;
      if (!details?.open) return;
      if (details.contains(event.target as Node)) return;
      details.removeAttribute("open");
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <details ref={detailsRef} className="group md:hidden">
      <summary
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
        )}
        aria-label="Open menu"
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
                <Link
                  href={link.href}
                  className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={closeMenu}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </details>
  );
}
