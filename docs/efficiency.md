# Efficiency dig (Neon / Vercel / client)

Living notes from the efficiency dig on prod `party.narula.xyz`. Track work via the GitHub issue; this file is the durable checklist. Prefer direct-to-main commits (avoid Neon preview branches from PRs).

## Ranked wastes

| Sev | Waste | Paths | Minimal fix | Dogfood risk |
|-----|--------|-------|-------------|--------------|
| High | Host preview rebuilds full guest tree every keystroke | `components/host-editor.tsx`, `lib/host-live-draft.ts`, `components/host-workspace.tsx`, `components/host-party-preview.tsx` | **Shipped:** debounce ~200ms; dirty-section identity + memo; Preview-tab-only below `lg`; desktop split kept | Low |
| High | Dump→draft OpenRouter: 50s abort + `maxRetries: 1` | `lib/plan-ingest-errors.ts`, `lib/plan-extract.ts`, `lib/create-trip.ts`, `lib/admin-api/collection.ts` | **Shipped:** 25s abort; `maxRetries: 0`; fail to labeled/ISO heuristics or 503. No Untitled success for messy dumps | Medium |
| High | `content_versions` full snapshots; head = SELECT all + MAX in JS | `lib/content-versions.ts`, `drizzle/0006_content_versions.sql`, `lib/host-access.ts` | **Shipped:** head `LIMIT 1`; skip identical consecutive snapshots; keep last 20 drafts + all published | Low / med |
| Med–High | Host page 3–4× `parties` lookups (full jsonb) | `app/[slug]/host/page.tsx`, `lib/host-access.ts` | **Shipped:** one `loadHostPageState` parties fetch, then guests. Auth/ownership unchanged | Low |
| Med | Guest RSVP sequential double resolve; `force-dynamic` | `components/sections/rsvp.tsx`, `lib/rsvp-roster.ts`, `app/g/[token]/page.tsx` | **Shipped:** `loadPublicRsvp` + React `cache()` for RSC token lookup; proxy uses meta-only columns. `force-dynamic` kept | Low |
| Med | New `neon()` client every `getDb()` | `lib/db/index.ts` | **Shipped:** module/`globalThis` singleton keyed by `DATABASE_URL` | Low |
| Low | Packing localStorage fan-out (not Neon) | `lib/packing-storage.ts`, `components/sections/packing.tsx` | Only if profiled | Negligible |

## Cleared
- No ensureSchema / migrate-on-request; migrations at build (`scripts/db-migrate-if-url.mjs`).
- No guest roster polling; cost is SSR per load.
- Packing checkoffs are browser-local — not Agent World Neon transfer.
- Host preview: lg+ live split is debounced (~200ms) with dirty-section reuse; below `lg` the Edit tab does not rebuild preview.
- Host workspace GET: one `parties` jsonb read (`loadHostPageState`), then guests.
- `content_versions`: head is `ORDER BY version DESC LIMIT 1`; skip identical consecutive snapshots; keep last 20 drafts and all published (0008).
- `getDb()` reuses one Neon/drizzle client per process (`resetDb()` for tests).
- Guest `/g/{token}`: proxy meta lookup (no jsonb); RSC layout/page/RSVP share one token resolve; `loadPublicRsvp` loads roster+prefill together.
- Admin/API list uses `count()` for RSVPs; `authorizePartyBySlug` loads jsonb only for GET/PATCH; cookie fallbacks skip `draftContent`.

## Quick wins vs later
**Quick:** preview debounce, host load coalesce, version head query, `getDb` singleton, create timeout/retry tweak (shipped).  
**Later:** async OpenRouter extract, CDN/static for published chrome.

## Evidence anchors
- Preview: `useHostPreviewContent` in `host-workspace.tsx`; `livePreviewContent` reuses unchanged sections; `PartyChrome` memoizes slices.
- Timeout: `PLAN_EXTRACT_TIMEOUT_MS = 25_000`; ingest deadline 28s; client 35s; `maxDuration` 40s; `maxRetries: 0`.
- Versions: `recordContentVersion` uses `ORDER BY version DESC LIMIT 1`; draft retention 20.
- Host page: `loadHostPageState` (one parties read) then guests.

Shipped on `main`: `c7ea24892474640bce08613471682d89a2640847` (items 1–3).