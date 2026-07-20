# Landing Page + Dark/Light Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the logged-out placeholder on `/` with a real landing page pitching the tool, and add a site-wide dark/light theme toggle.

**Architecture:** Wire up `next-themes` (already an installed, unused dependency) via a `ThemeProvider` in the root layout, add a toggle button to the always-rendered `SiteNav`, and build a new `LandingView` component that `app/page.tsx` renders when nobody is logged in.

**Tech Stack:** Next.js App Router (Server + Client Components), `next-themes`, Tailwind CSS (dark-variant already configured in `app/globals.css`), `lucide-react` icons.

## Global Constraints

- Theme toggle is site-wide (every page via `SiteNav`), binary dark/light only — no "system" mode.
- `next-themes` config: `attribute="class"`, `defaultTheme="dark"`, `disableTransitionOnChange`. Default appearance must not change until a user toggles.
- Landing page pitches the tool itself, not a specific trip (per README: "No real trip details live in this repo"). Match the existing brand voice — mono uppercase eyebrow label, big display headline, tagline — same pattern as `components/sections/hero.tsx`.
- GitHub link points to `https://github.com/narulaskaran/bachelor-party`, lives in a small footer, not the nav.
- No changes to auth, routing, or party data logic — presentation only.

---

### Task 1: Wire `next-themes` into the root layout

**Files:**
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: a `ThemeProvider` (from `next-themes`) wrapping the app body, `defaultTheme="dark"`. Task 2's `ThemeToggle` depends on this being in place (its `useTheme()` call only works inside this provider).

- [ ] **Step 1: Replace the hardcoded `dark` class with `ThemeProvider`**

Replace the full contents of `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { SiteNav } from "@/components/site-nav";
import { Toaster } from "@/components/ui/sonner";
import { getCurrentParty } from "@/lib/current-party";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

// Generic pre-auth metadata: no names, dates, or places.
export const metadata: Metadata = {
  title: "The Big Send",
  description: "Private trip site. Password's in the group chat.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Nav shows trip branding only after login resolves a party.
  const current = await getCurrentParty();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${barlowCondensed.variable} h-full scroll-smooth antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
          <SiteNav
            siteName={current?.content.trip.siteName}
            dateLabel={current?.content.trip.dateLabel}
          />
          <main className="flex-1">{children}</main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

Two changes from the current file: (1) the literal `dark` class is removed from `<html>`'s `className` — `next-themes` now controls it; (2) `suppressHydrationWarning` is added to `<html>` — required because `next-themes` sets the theme class via an inline script before first paint, so server-rendered and client-rendered markup briefly disagree on that one attribute. This is the documented, expected way to silence that specific warning (it does not suppress other hydration mismatches).

- [ ] **Step 2: Run the build**

Run: `npm run build`
Expected: Compiles successfully, no TypeScript errors, no missing-module errors for `next-themes` (it's already in `package.json`).

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: wire next-themes ThemeProvider into root layout"
```

---

### Task 2: Build the theme toggle and wire it into `SiteNav`

**Files:**
- Create: `components/theme-toggle.tsx`
- Modify: `components/site-nav.tsx`

**Interfaces:**
- Consumes: `ThemeProvider` from Task 1 (must already wrap the tree for `useTheme()` to work). `Button` from `components/ui/button.tsx` (`variant="ghost"`, `size="icon"`, unchanged).
- Produces: `ThemeToggle(): JSX.Element` — a client component, self-contained, no props. Rendered by `SiteNav`, which every page already includes.

- [ ] **Step 1: Create the toggle component**

Create `components/theme-toggle.tsx`:

```tsx
"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="hidden dark:block" />
      <Moon className="block dark:hidden" />
    </Button>
  );
}
```

This uses the CSS `dark:` variant (already configured in `app/globals.css:5` — `@custom-variant dark (&:is(.dark *));`) to swap which icon is visible, rather than conditionally rendering based on `resolvedTheme` in JS. This is the standard `next-themes` + Tailwind pattern and avoids a hydration-mismatch flash: both icons exist in the DOM immediately, CSS (which already matches the class `next-themes` set before paint) decides which one shows, so there's no client-only branch that could render differently than the server did.

- [ ] **Step 2: Wire the toggle into `SiteNav`, remove the dead `/login` check**

Replace the full contents of `components/site-nav.tsx`:

```tsx
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

// Single-page site: nav is anchor jumps within /.
const links = [
  { href: "/#schedule", label: "Schedule" },
  { href: "/#activities", label: "Activities" },
  { href: "/#basecamp", label: "Basecamp" },
  { href: "/#rsvp", label: "Your Info" },
];

export function SiteNav({
  siteName,
  dateLabel,
}: {
  siteName?: string;
  dateLabel?: string;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/"
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
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
```

Two things changed beyond adding the toggle: `"use client"` and the `usePathname`/`if (pathname === "/login") return null` check are both removed. That check is dead code — `/login` was deleted in the per-party slug-routes PR (#14) — and removing it means `SiteNav` no longer needs `usePathname` at all, so it can go back to being a Server Component (it renders `ThemeToggle`, a Client Component, as a child, which is fine — Server Components can render Client Components directly).

- [ ] **Step 3: Run the build**

Run: `npm run build`
Expected: Compiles successfully. No errors about `usePathname` or missing `"use client"` (there should be none needed in `site-nav.tsx` anymore).

- [ ] **Step 4: Run lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Manually verify the toggle renders**

Run: `npm run dev`, then `curl -s http://localhost:3000/ | grep -o 'aria-label="Toggle theme"'`
Expected: one match — confirms the button is present in the server-rendered HTML on any page (the nav renders everywhere now).

Note: full interactive verification (clicking the toggle actually flips light/dark) requires a real browser and isn't curl-able — that's expected, not a gap to fix here; note it in your report as browser-unverified, code-reviewed only.

- [ ] **Step 6: Commit**

```bash
git add components/theme-toggle.tsx components/site-nav.tsx
git commit -m "feat: add theme toggle to SiteNav, drop dead /login check"
```

---

### Task 3: Build the landing page content

**Files:**
- Create: `components/landing-view.tsx`

**Interfaces:**
- Consumes: `Button` from `components/ui/button.tsx` (`variant="link"`, `size="sm"`, `asChild`, unchanged).
- Produces: `LandingView(): JSX.Element` — no props, self-contained. Task 4 renders it from `app/page.tsx`.

- [ ] **Step 1: Create the component**

Create `components/landing-view.tsx`:

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LandingView() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-5xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Trip Logistics, Handled
      </p>
      <h1 className="mt-4 font-display text-5xl font-bold uppercase tracking-wide sm:text-7xl">
        The Big Send
      </h1>
      <p className="mt-4 max-w-xl text-lg text-muted-foreground">
        A password-gated logistics site for bachelor parties and group trips.
        Each party gets its own page — schedule, lodging, activities, and an
        RSVP form — behind a shared password only your group has.
      </p>
      <p className="mt-8 text-sm text-muted-foreground">
        Got an invite link from your organizer? Use it to see your trip.
      </p>
      <footer className="mt-16 border-t border-border pt-6">
        <Button variant="link" size="sm" asChild>
          <Link
            href="https://github.com/narulaskaran/bachelor-party"
            target="_blank"
            rel="noopener noreferrer"
          >
            View on GitHub
          </Link>
        </Button>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Run the build**

Run: `npm run build`
Expected: Compiles successfully. `LandingView` isn't rendered anywhere yet (that's Task 4), so this only checks the component itself compiles.

- [ ] **Step 3: Commit**

```bash
git add components/landing-view.tsx
git commit -m "feat: add LandingView component"
```

---

### Task 4: Render `LandingView` on the logged-out root page

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `LandingView` from Task 3 (exact name/signature above).

- [ ] **Step 1: Replace the placeholder with `LandingView`**

Replace the full contents of `app/page.tsx`:

```tsx
import { getCurrentParty } from "@/lib/current-party";
import { PartyView } from "@/components/party-view";
import { LandingView } from "@/components/landing-view";

export const dynamic = "force-dynamic";

export default async function Page() {
  const current = await getCurrentParty();
  if (!current) {
    return <LandingView />;
  }

  return <PartyView content={current.content} />;
}
```

- [ ] **Step 2: Run the build**

Run: `npm run build`
Expected: Compiles successfully.

- [ ] **Step 3: Manually verify the logged-out and logged-in paths**

With `.env.local` containing `PARTY_PASSWORD=test123` and no `DATABASE_URL` (forces the password-gated demo path rather than the open-demo path), run `npm run dev` in the background, then:

```bash
curl -s http://localhost:3000/ | grep -o "Trip Logistics, Handled"
```
Expected: one match — confirms `LandingView` renders when logged out (not the old placeholder text, not `PartyView` content).

```bash
curl -s http://localhost:3000/ | grep -c "Use your party"
```
Expected: `0` — confirms the old placeholder line is gone.

Then log in via `/demo` (POST the login form as in the slug-routes plan, or just confirm via code review that `PartyView` is unchanged and still reachable through the existing `getCurrentParty()` branch — this task didn't touch that path, only the `!current` branch).

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: render LandingView on the logged-out root page"
```

---

### Task 5: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: PASS, all existing tests (this feature adds no new pure-logic functions, so no new test files — per the spec's Testing section, this is presentation-only work verified manually).

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Compiles successfully, same route table as before this branch (no new routes — `/`, `/[slug]`, `/api/admin/*`).

- [ ] **Step 4: Full manual pass**

With `.env.local` containing `PARTY_PASSWORD=test123`, no `DATABASE_URL`, run `npm run dev`:
- `curl -s http://localhost:3000/` logged out → contains "Trip Logistics, Handled", "View on GitHub", and `aria-label="Toggle theme"`; does not contain "Use your party's link".
- `curl -s http://localhost:3000/demo` → still shows the party login form (this branch didn't touch `app/[slug]/*`).
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/not-a-real-slug` → still `404`.

- [ ] **Step 5: Commit if anything was fixed during verification**

```bash
git add -A
git commit -m "fix: <describe whatever verification turned up, if anything>"
```
