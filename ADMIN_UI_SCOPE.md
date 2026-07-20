# Admin UI — scope

A human-facing counterpart to `/api/admin/**`, for creating/editing parties
without hand-writing JSON. Not built yet — this is the plan to greenlight.

## Auth

Separate from party passwords and from `ADMIN_API_TOKEN`. Simplest fit for
this project's threat model (you, occasionally, from a browser):

- New env var `ADMIN_UI_PASSWORD`. Its own login page at `/admin/login`,
  its own cookie (`bp_admin`, httpOnly, distinct from the party cookie so
  the two sessions don't collide). Same SHA-256-cookie pattern already used
  for party login, just a second instance of it.
- `/admin/**` gated via self-check: each route checks the `bp_admin`
  cookie (SHA-256 hashed password) before rendering — mirroring how
  `app/[slug]/page.tsx` gates party access with `cookieAuthenticatesParty`.
  No longer routed through `proxy.ts` (that's now purely a party auth gate).

## Pages

- **`/admin`** — party list. Table: site name, groom, date label, guest
  count, updated-at. Row click → edit. "New party" button.
- **`/admin/parties/new`** and **`/admin/parties/[slug]`** — one form,
  two modes. Sections mirror `PartyContent`:
  - Trip basics (name, tagline, dates, location, coordinates, elevation,
    airport)
  - Lodging (name, url, address, specs, amenities as a tag input, cost)
  - Schedule — repeatable day blocks, each with repeatable entries
    (time/title/note/marquee toggle). This is the fiddliest part of the
    form; a JSON-textarea escape hatch (paste raw content) is a reasonable
    v1 fallback if the structured editor gets too big to build in one pass.
  - Activities — three repeatable lists (core / if-time-allows / backups),
    core entries get repeatable venue options.
  - Action items — repeatable title/note/anchor rows.
  - Password field, with a "generate" button (random slug-safe string).
- **`/admin/parties/[slug]/guests`** — read-only RSVP table for that party
  (name, flights, dietary, votes, notes). Export-to-CSV is a nice-to-have,
  not core.

## Data flow

Server actions in `app/admin/**`, calling the same `getDb()` +
`schema.parties`/`schema.guests` the API routes use — no reason to make
the UI call its own API over HTTP. The admin API and the admin UI become
two clients of the same data layer.

## Build order (if greenlit)

1. Admin login + `/admin` list page (read-only) — smallest useful slice,
   proves the auth pattern.
2. Party create/edit form with the JSON-textarea escape hatch for
   schedule/activities — unblocks real usage fast.
3. Guest roster view per party.
4. Structured editors for schedule/activities, replacing the textarea,
   if the JSON route feels too rough day-to-day.

## Explicitly out of scope (v1)

- Multi-admin accounts / roles — one shared admin password is enough for
  a single organizer.
- Image/asset uploads for lodging photos — link out to the Airbnb listing
  instead, as today.
- Audit log of edits — jsonb content has no history; `updated_at` is the
  only signal.
