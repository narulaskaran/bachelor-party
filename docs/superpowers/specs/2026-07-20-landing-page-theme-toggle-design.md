# Landing page + dark/light toggle — design spec

## Problem

Bare `/` currently renders whoever's auth cookie is set, or (since the
`/:slug` routes spec, `docs/superpowers/specs/2026-07-20-slug-routes-design.md`)
a one-line placeholder ("Use your party's link to view your trip.") when
logged out. That placeholder was explicitly a stopgap. This spec replaces it
with a real landing page: a pitch for the tool itself, a small GitHub link,
and a dark/light theme toggle — decomposed out of the slug-routes work as
its own follow-up.

## Decisions

- **Content pitches the tool, not a trip.** Per README, "No real trip
  details live in this repo" — content is managed entirely through the
  admin API by whoever runs a deployment. The landing page explains what
  the tool is (a password-gated, per-party logistics site for bachelor
  parties / group trips) and how access works (organizer shares a party
  link + password), matching the existing brand voice (mono uppercase
  eyebrow label, big display headline, tagline — same pattern as
  `components/sections/hero.tsx`).
- **Theme toggle is site-wide**, not landing-page-only. It lives in
  `SiteNav`, which already renders on every page. One theme setting for the
  whole app — simpler mental model than resetting on login.
- **Built on `next-themes`**, already an installed, unused dependency
  (`package.json`). `app/layout.tsx` currently hardcodes the `dark` class on
  `<html>`; this becomes `next-themes`' `ThemeProvider` with
  `defaultTheme="dark"` — visually identical to today until someone
  toggles. No hand-rolled `localStorage`/flash-prevention script; that's
  exactly what the library already does.
- **Binary toggle (dark/light), no OS-following "system" mode.** Keeps the
  UI to a single icon button rather than a three-state picker.
- **GitHub link is small and in a footer**, not the nav — points to
  `https://github.com/narulaskaran/bachelor-party`.

## Architecture

### `app/layout.tsx` (modify)

Replace the hardcoded `dark` class with `next-themes`' `ThemeProvider`:
`attribute="class"`, `defaultTheme="dark"`, `disableTransitionOnChange`. Add
`suppressHydrationWarning` to `<html>` — required because `next-themes` sets
the theme class via an inline script before first paint, so server and
client markup briefly disagree on that one attribute; this is the
documented, expected way to silence that specific (harmless) warning.

### `components/theme-toggle.tsx` (new)

Client component. Sun/Moon icon button (`lucide-react`, already a
dependency) using `next-themes`' `useTheme()` hook. Clicking flips between
`"dark"` and `"light"`.

### `components/site-nav.tsx` (modify)

- Add `<ThemeToggle />` to the header's right side, next to the existing nav
  links.
- Remove the `if (pathname === "/login") return null` early return — dead
  code now that `/login` doesn't exist (removed in the slug-routes PR).
  Touched incidentally because this task is already editing this file for
  the toggle; not a separate unrelated refactor.

### `components/landing-view.tsx` (new)

The actual pitch content: eyebrow label, display headline, tagline
paragraph explaining the model (per-party password-gated site, organizer
manages content via the admin API), a short line telling a logged-out
visitor with no link what to do ("Got an invite link from your organizer?
Use it to see your trip."), and a footer with a small link to
`https://github.com/narulaskaran/bachelor-party`.

### `app/page.tsx` (modify)

Swap the current placeholder `<p>` block (in the `!current` branch) for
`<LandingView />`.

### Unchanged

- `PartyView`, `app/[slug]/*`, `lib/current-party.ts`, `lib/auth.ts`,
  `lib/party-auth.ts` — none of this touches auth or party-rendering logic.
- Light-mode CSS custom properties in `app/globals.css`'s `:root` block
  already exist and are already correct — no palette work needed, just
  making them reachable via the toggle instead of always overridden by the
  hardcoded `dark` class.

## Testing

This is UI/presentation work with no new business logic — no new pure
functions to unit test. Verification is manual: build succeeds, toggle
flips the visible theme and persists across a reload (via `next-themes`'
built-in `localStorage` persistence), landing page renders when logged out,
`PartyView` and login forms are unaffected when logged in.

## Out of scope

- Any change to auth, routing, or party data — this is presentation-only.
- System/OS theme following.
- Per-party branding on the landing page (there is no current party to
  brand it with, by definition of being logged out).
