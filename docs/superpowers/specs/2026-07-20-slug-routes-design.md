# Per-party `/:slug` routes — design spec

## Problem

The site has never had a per-party URL. Access is: go to `/login`, enter the
shared password, get a cookie, see whichever party that cookie belongs to at
`/`. There is no link an organizer can share that identifies a specific party
(`denver2k26`) — the slug only exists as a database key and in the admin API,
never in a browser-facing URL. Organizers want a shareable link per party,
e.g. `https://bachelor-party-eight.vercel.app/denver2k26`.

This spec covers the routing/auth change only. A separate, later spec covers
turning bare `/` into a marketing landing page (GitHub link, dark/light
toggle) — decomposed out because it's an independent feature. Ships as two
separate PRs.

## Decisions

- **Password still required.** Visiting `/:slug` does not bypass auth — the
  slug is not a secret, the party's password still is. `/:slug` shows that
  party's login form.
- **Per-party auto-redirect.** If the existing `AUTH_COOKIE` already
  authenticates the caller for *this exact* party (slug's party id + current
  password match), skip the login form and render content directly.
- **Switching parties.** If the cookie authenticates a *different* party,
  `/:slug` still shows this slug's own login form (no auto-switch, no error
  — just a normal login prompt). Submitting it overwrites the cookie to the
  new party.
- **`/login` is removed**, folded into `/:slug`. Bare `/login` falls through
  to the dynamic route with `slug="login"`, finds no matching party, 404s.
  This is expected, not a special case to guard against.
- **Root `/` is interim-only in this spec.** It keeps today's behavior
  (render whichever party the cookie belongs to) but its `redirect("/login")`
  fallback — dead once `/login` is gone — is replaced with a plain
  placeholder line ("Use your party's link to view your trip."). Fully
  replaced by the landing-page spec/PR later.
- **No-DB / demo mode** (env-only fallback used in local dev, gated by
  `PARTY_PASSWORD`) is bound to a fixed slug, `/demo`. Any other slug in this
  mode 404s.

## Architecture

### New: `app/[slug]/page.tsx` (Server Component)

1. Look up the party by slug (`db-or-demo` aware, see below).
2. Not found → `notFound()` (404).
3. Found → check whether `AUTH_COOKIE` authenticates *this* party id
   specifically (same hash check as today's `getCurrentParty`, scoped to one
   row instead of "whichever cookie matches any party").
4. Authenticated → render `<PartyView content={party.content} />` (existing
   JSX from `app/page.tsx`, extracted into a shared component so both routes
   use it).
5. Not authenticated → render a login form scoped to this slug.

### New: `app/[slug]/actions.ts` — slug-scoped login action

- Looks up the party **by slug** (not by scanning all parties for a matching
  password, which is what today's global `/login` action does).
- Compares submitted password to that one row.
- On match: sets `AUTH_COOKIE` using the existing `authCookieValue(partyId,
  password)` format — unchanged cookie shape, so `getCurrentParty()`,
  `lib/rsvp-actions.ts`, and `app/layout.tsx` keep working untouched.
- On mismatch: return `{ error }` to the form, same UX pattern as today.
- Redirect target is always `/${slug}` (no arbitrary `from` param — the slug
  IS the destination).

### Removed: `app/login/` (`page.tsx`, `actions.ts`, `login-form.tsx`)

Replaced by the above. The login form UI itself is reused/adapted, not
rewritten — same fields, same error display, just posts to the slug-scoped
action and lives under `app/[slug]/`.

### Changed: `app/page.tsx`

- Keep existing `getCurrentParty()` → render-current-party behavior.
- Replace the `redirect("/login")` no-current-party branch with a static
  placeholder (no component logic beyond a line of text). This is
  intentionally minimal — the real root experience is a separate spec.

### Changed: `proxy.ts`

Today's edge middleware redirects any cookie-less request to `/login`. Once
`/login` is gone, that redirect target 404s — every logged-out visit to any
route would break. Every route now self-gates in its own render logic
(`app/page.tsx` shows a placeholder, `app/[slug]/page.tsx` shows its own
login form), so the edge redirect no longer serves a purpose. Delete
`proxy.ts` entirely rather than leave a no-op file — nothing left for it to
do, and the DB lookup for real auth already happens on every render
regardless.

### Unchanged

- `lib/current-party.ts` (`getCurrentParty`) — still resolves "whichever
  party this cookie belongs to," used by `app/layout.tsx`, `app/page.tsx`,
  and `lib/rsvp-actions.ts`. Not slug-aware, and doesn't need to be — those
  call sites don't have a slug in scope.
- `lib/auth.ts` (`AUTH_COOKIE`, `partyToken`, `authCookieValue`) — cookie
  format is party-scoped already (`<partyId>.<hash>`), no changes needed.
- Admin API (`/api/admin/**`) — entirely separate auth (bearer token), not
  touched by this spec.

## New/changed logic worth unit-testing

Extract the "does this cookie authenticate this specific party" check into a
small pure function (mirrors the `lib/admin-auth.ts` test style — no DB
needed to test the comparison itself):

- Correct password → cookie set, redirected to `/${slug}`, content renders.
- Wrong password → error message, login form re-shown.
- Cookie already authenticates this exact party → login form skipped,
  content renders directly on GET.
- Cookie authenticates a *different* party → login form still shown (no
  auto-switch).
- Unknown slug → 404.
- No-DB demo mode: `/demo` works via `PARTY_PASSWORD`; any other slug 404s.

## Out of scope (this spec)

- Landing page at `/` (hero content, GitHub link, dark/light toggle) —
  separate spec, separate PR.
- Any change to the admin API or `admin_token` auth.
- Shareable "passwordless" links — explicitly rejected; password stays
  required per the decision above.
