# Admin API, CLI, and MCP

Human intro is in the [README](../README.md). This is the machine surface:
HTTP, `bigsend`, and MCP.

Canonical paths are `/api/admin/trips/**`. `/api/admin/parties/**` rewrites to
those handlers (alias for existing scripts). Machine-readable spec:
`GET /api/openapi.json` (unauthenticated). The database table is still
`parties`.

`POST /api/admin/trips` needs **no Authorization**. The **201 organizer packet**
is `url`, `hostUrl` (`/{slug}/host`), `guestUrl` (always `null` until publish),
`slug`, `password`, `adminToken` (host key), `content`, `draftReview`,
`published: false`. Keep `url`/`password` for older clients; new agents should
use `hostUrl` + `adminToken`. Create never mints a guest URL.

Create accepts either a **plan dump** (`plan`, optional `preset` of
`night-out` | `weekend`, optional `siteName`, optional `startDate` /
`endDate` overrides) or structured `content` (the only required structured
field is `content.trip.siteName`). A plan dump reuses `ingestEventPlan` —
the same path as the landing “Create draft” button. The server asks
OpenRouter (`z-ai/glm-5.3-flash`, `OPENROUTER_API_KEY`) to extract only
facts the host wrote, then maps that JSON into `PartyContent` +
`draftReview`. It never invents time, place, address, or headcount.
Missing, ambiguous, or non-IANA timezones stay empty with fact status
`missing` (TBD). If the model is down, labeled-line / ISO dumps fall back
to the regex parser (still never invents). An unlabeled messy paragraph
returns **503** instead of an empty Untitled event. The first unlabeled
line can still supply the name on the fallback parser when `siteName` is
omitted.

**Agents cannot silently publish.** `POST` create and `PATCH` / CLI `set` / MCP
`set` edit the working draft only. Guests keep the last published snapshot.
Publish is host-only: the site Publish button, or
`POST /api/admin/trips/:slug/publish` with the host session cookie or host key
(`Authorization: Bearer <adminToken>`). That response includes
`guestUrl: "/g/{token}"`.

Slug and guest password autogenerate when omitted. `POST` is create-only: a
colliding slug returns **409** (GET + PATCH instead of upsert). Reserved
app-route slugs (`admin`, `api`, `rsvp`, `schedule`, `activities`, `basecamp`,
`login`, `demo`) return **400**; autogen skips those names and existing trips.
See `RESERVED_SLUGS` in `lib/slug.ts`. Unauthenticated create is rate-limited
per IP.

`PATCH` applies [JSON Merge Patch](https://datatracker.ietf.org/doc/html/rfc7396)
to the **working draft** (`null` deletes a key; arrays replace). A full
document still works. PATCH never sets `published: true` and never changes what
guests see. Validation errors return `{ error, issues: [{ path, message, hint }] }`.

List/create/get responses include both `trips`/`trip` (canonical) and
`parties`/`party` (alias).

## Content version history (P2-3 audit trail)

Every content change appends one immutable row to the `content_versions`
table with a **full content snapshot** (not a diff): draft saves and
publishes from the host editor (`actorType: "host"`) and content PATCHes
via the admin API (`actorType: "admin"`). Rows are never updated or
deleted — enforced in application code and again by `BEFORE UPDATE/DELETE`
triggers in migration `0006_content_versions.sql`, so published history
survives forever. The bearer/admin credential is stored only as a one-way
fingerprint (`sha256:<12 hex>`), never raw.

Read it back with:

```
GET /api/admin/trips/:slug/versions?limit=100
Authorization: Bearer <adminToken>
```

Returns `{ trip: { slug }, party: { slug }, versions: [...] }`, newest
first. Each version: `id`, `version` (per-party 1, 2, 3, …), `state`
(`draft` | `published`), `contentSnapshot`, `baseVersion`, `actorType`,
`actorId`, `changeSummary`, `createdAt`, `publishedAt` (published rows
only). There is intentionally no restore endpoint yet.

```bash
# Dump a messy plan into an unpublished draft (same as landing “Create draft”)
curl https://your-deploy.vercel.app/api/admin/trips \
  -H "Content-Type: application/json" \
  -d '{"plan":"Cabin weekend\nLocation: Denver, CO\n2026-09-04 7:00 PM — arrive","preset":"weekend"}'

# Sparse create — name is enough; still unpublished; no deploy secret
curl https://your-deploy.vercel.app/api/admin/trips \
  -H "Content-Type: application/json" \
  -d '{"content":{"trip":{"siteName":"Jackson Hole '\''26"}}}'

# Merge-patch a Saturday dinner (use the packet's adminToken)
curl https://your-deploy.vercel.app/api/admin/trips/jackson-hole-26 \
  -X PATCH \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":{"schedule":[{"key":"saturday","date":"2026-09-05","weekday":"Saturday","label":"Dinner","timed":true,"entries":[{"title":"Dinner","time":"7:00 PM","marquee":true}]}]}}'

# Packing list (guest check-off is local to each browser)
curl https://your-deploy.vercel.app/api/admin/trips/jackson-hole-26 \
  -X PATCH \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":{"packing":[{"title":"Government ID"},{"title":"Layers","note":"Nights drop below 40"}]}}'

# Explicit host publish (never implied by create or PATCH)
curl https://your-deploy.vercel.app/api/admin/trips/jackson-hole-26/publish \
  -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Content shape: `lib/party-types.ts`, validated by `lib/party-schema.ts`. Demo:
`lib/demo-party.ts`. `GET /demo` always serves that Alpine Weekend sample —
even when a database is configured, and even if a leftover `slug=demo` row
exists — so the guest site can be evaluated without creating a trip. New
creates cannot use the reserved `demo` slug.

Schedule entries may set `marquee: true` to mark a **key event**. They render
in the primary color on the guest timeline. Hosts pick them at `/:slug/host`
with the packet host key (the sample picker is `/demo/host`, not saved).
CLI: `schedule add --key-event` (`--marquee` still works). MCP: `schedule_add`
with `keyEvent: true`.

Optional `content.packing` is `{ title, note? }[]` — a host packing list.
Guests check items off in their own browser (`localStorage` keyed by trip
slug). It is not a shared roster. Hosts can edit the list in the on-site
editor; agents can still PATCH or `bigsend set`. Empty or missing packing
hides the Pack section and nav link.

| Route | Method | Does |
| --- | --- | --- |
| `/api/admin/trips` | GET | The trip for the presented `adminToken` (never a list-all) |
| `/api/admin/trips` | POST | Create unpublished draft — `plan` dump or `siteName`. No auth. Never returns a guest URL. 400 if reserved; 409 if the slug exists. |
| `/api/admin/trips/:slug` | GET | Full record; `content` is the working draft |
| `/api/admin/trips/:slug` | PATCH | Merge-patch the working draft and/or replace `password`. Does not publish. |
| `/api/admin/trips/:slug/publish` | POST | Host-only publish. Bearer host key or host session cookie. Returns `guestUrl`. |
| `/api/admin/trips/:slug` | DELETE | Delete the trip and its guest RSVPs |
| `/api/admin/trips/:slug/guests` | GET | List that trip's RSVPs |
| `/api/admin/trips/:slug/guests/export` | GET | Download the full-detail guest roster as CSV (organizer token only) |
| `/api/admin/trips/:slug/guests/:id` | DELETE | Remove one guest RSVP |
| `/api/openapi.json` | GET | OpenAPI 3.1 (from the Zod schemas) |

`/api/admin/parties/**` is a rewrite onto the same trips handlers. Slug routes
accept `Authorization: Bearer` of that trip's `adminToken` only.

## `bigsend` CLI

HTTP-only (no `DATABASE_URL`). JSON on stdout; errors on stderr. `create` needs
no token. The trip `adminToken` from the packet is stored in `~/.bigsend.json`
(or `BIGSEND_CONFIG`). Set `BIGSEND_TOKEN` to that packet token for follow-up
commands if the config file is not in play.

```bash
export BIGSEND_API_URL=https://your-deploy.vercel.app

npm run bigsend -- create --name "E2E Smoke"
npm run bigsend -- create --plan "Cabin weekend in Denver" --preset weekend
npm run bigsend -- set e2e-smoke --patch '{"trip":{"airport":"JAC"}}'
npm run bigsend -- publish e2e-smoke
npm run bigsend -- schedule add e2e-smoke --day 2026-09-05 --title "Dinner" --key-event
npm run bigsend -- get e2e-smoke
npm run bigsend -- guests e2e-smoke
npm run bigsend -- delete e2e-smoke --yes
```

`create --file party.json` accepts the old seed shape (`slug`, `password`,
`content`) or a `{ plan, preset?, siteName? }` dump. `create` and `set` never
publish. `publish` is the explicit host action. `delete` requires `--yes`.
Full usage: `npm run bigsend -- --help`.

## MCP (Claude Desktop / Cursor)

Same verbs as the CLI, same HTTP client, same `BIGSEND_*` env. Stdio server:

```bash
npm run mcp
```

Example Cursor / Claude MCP config (from the repo root):

```json
{
  "mcpServers": {
    "bigsend": {
      "command": "npx",
      "args": ["tsx", "mcp/bigsend.ts"],
      "env": {
        "BIGSEND_API_URL": "https://your-deploy.vercel.app"
      }
    }
  }
}
```

After `create`, the packet `adminToken` is stored in `~/.bigsend.json`. To
mutate an existing trip from another machine, set `BIGSEND_TOKEN` to that
trip's packet token.

Tools: `create`, `get`, `set`, `publish`, `lodging_set`, `schedule_add`, `activities_add`,
`guests`, `password`, `delete` (`yes: true` required). `create` and `set` never
publish; `publish` is an explicit host action (same rule as the HTTP API).
