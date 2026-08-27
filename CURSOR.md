# Project map

Next.js App Router site (Vercel) for private event pages. Neon/Drizzle when
`DATABASE_URL` is set. Design tokens in `app/globals.css` (stone / charcoal,
amber primary). Tests: Vitest.

## Human product

Landing dump (server extracts facts via OpenRouter `z-ai/glm-5.3-flash`) →
host editor at `/{slug}/host` → inert PartyView preview on
that same page → publish → guest page at `/g/{token}`. Two presets, one
Event: Night out (hero + RSVP) and Weekend trip (optional glance, schedule,
lodge, activities, pack). Empty blocks stay hidden. Pack checkoff is local
per browser. RSVP identity is stored per event, never a leftover name from
another trip. Who’s coming is queried for this invite only. Host Guest view opens the minted `/g/{token}` (unpublished
`/{slug}` 404 stays correct). Unpublished `/g/{token}` shows that the event
isn't public yet. Legacy events without a guest token still use `/{slug}`
plus a password.

## Stored shape

Canonical guest aggregate is Event. Rows still live in `parties` with
`content.trip` and `kind: "trip"` so existing API/CLI payloads keep working.
Do not split into two apps. Schema: `lib/party-types.ts`, `lib/party-schema.ts`.

## Machine surface

Admin API, `bigsend` CLI, and MCP: [docs/api.md](docs/api.md). Not the R1
human loop.
