# Efficiency dig (Neon / Vercel / client)

Living notes from the efficiency dig on prod `party.narula.xyz`. Track work via the GitHub issue; this file is the durable checklist. Prefer direct-to-main commits (avoid Neon preview branches from PRs).

## Ranked wastes

| Sev | Waste | Paths | Minimal fix | Dogfood risk |
|-----|--------|-------|-------------|--------------|
| High | Host preview rebuilds full guest tree every keystroke | `components/host-editor.tsx`, `lib/host-live-draft.ts`, `components/host-workspace.tsx`, `components/host-party-preview.tsx` | **Shipped:** debounce ~200ms; dirty-section identity + memo; Preview-tab-only below `lg`; desktop split kept | Low |
| High | Dump→draft OpenRouter: 50s abort + `maxRetries: 1` | `lib/plan-ingest-errors.ts`, `lib/plan-extract.ts`, `lib/create-trip.ts`, `lib/admin-api/collection.ts` | Heuristic-first when useful; shorter timeout; `maxRetries: 0` on create; fail to heuristics on abort | Medium |
| High | `content_versions` full snapshots; head = SELECT all + MAX in JS | `lib/content-versions.ts`, `drizzle/0006_content_versions.sql`, `lib/host-access.ts` | **Shipped (head only):** `ORDER BY version DESC LIMIT 1`. Full snapshots kept for audit; retention/diff later | Low / med |
| Med–High | Host page 3–4× `parties` lookups (full jsonb) | `app/[slug]/host/page.tsx`, `lib/host-access.ts` | **Shipped:** one `loadHostPageState` parties fetch, then guests. Auth/ownership unchanged | Low |
| Med | Guest RSVP sequential double resolve; `force-dynamic` | `components/sections/rsvp.tsx`, `lib/rsvp-roster.ts`, `app/g/[token]/page.tsx` | Parked. Resolve once; `Promise.all`; narrow columns | Low |
| Med | New `neon()` client every `getDb()` | `lib/db/index.ts` | Module/`globalThis` singleton | Low |
| Low | Packing localStorage fan-out (not Neon) | `lib/packing-storage.ts`, `components/sections/packing.tsx` | Only if profiled | Negligible |

## Cleared
- No ensureSchema / migrate-on-request; migrations at build (`scripts/db-migrate-if-url.mjs`).
- No guest roster polling; cost is SSR per load.
- Packing checkoffs are browser-local — not Agent World Neon transfer.
- Host preview: lg+ live split is debounced (~200ms) with dirty-section reuse; below `lg` the Edit tab does not rebuild preview.
- Host workspace GET: one `parties` jsonb read (`loadHostPageState`), then guests.
- `content_versions` head is `ORDER BY version DESC LIMIT 1` (full snapshots still stored).

## Quick wins vs later
**Quick:** preview debounce, host load coalesce, version head query, `getDb` singleton, create timeout/retry tweak.  
**Later:** async OpenRouter extract, version retention/diffs, CDN/static for published chrome.

## Evidence anchors
- Preview: `useHostPreviewContent` in `host-workspace.tsx`; `livePreviewContent` reuses unchanged sections; `PartyChrome` memoizes slices.
- Timeout: `PLAN_EXTRACT_TIMEOUT_MS = 50_000`; `maxRetries: 1` in `extractPlanWithOpenRouter`.
- Versions: `recordContentVersion` uses `ORDER BY version DESC LIMIT 1`.
- Host page: `loadHostPageState` (one parties read) then guests. Parked: guest RSVP double lookup; OpenRouter 50s dump timeout.

Shipped on `main`: `c7ea24892474640bce08613471682d89a2640847` (items 1–3).