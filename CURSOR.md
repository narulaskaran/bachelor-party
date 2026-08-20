# Project map

Next.js App Router site (Vercel) for private event pages. Neon/Drizzle when
`DATABASE_URL` is set. Design tokens in `app/globals.css` (stone / charcoal,
amber primary). Tests: Vitest.

## Human product

Landing dump → host editor at `/{slug}/host` → preview → publish → guest
page at `/{slug}` (password). Two presets, one Event: Night out (details +
RSVP) and Weekend trip (optional schedule, lodge, activities, pack). Empty
blocks stay hidden. Pack checkoff is local per browser. Unpublished drafts
404 for guests.

## Stored shape

Canonical guest aggregate is Event. Rows still live in `parties` with
`content.trip` and `kind: "trip"` so existing API/CLI payloads keep working.
Do not split into two apps. Schema: `lib/party-types.ts`, `lib/party-schema.ts`.

## Machine surface

Admin API, `bigsend` CLI, and MCP: [docs/api.md](docs/api.md). Not the R1
human loop.
