# Admin API, CLI, and MCP

Human intro is in the [README](../README.md). This is the machine surface:
HTTP, `bigsend`, and MCP.

Canonical paths are `/api/admin/trips/**`. `/api/admin/parties/**` rewrites to
those handlers (alias for existing scripts). Machine-readable spec:
`GET /api/openapi.json` (unauthenticated). The database table is still
`parties`.

`POST /api/admin/trips` needs **no Authorization**. The **201 organizer packet**
is `url`, `slug`, `password`, `adminToken`. That `adminToken` is the only
credential after create: it authorizes every `/:slug` route for that trip, and
cannot see or mutate anyone else's.

The only required field on create is `content.trip.siteName`. Slug and guest
password autogenerate when omitted. `POST` is create-only: a colliding slug
returns **409** (GET + PATCH instead of upsert). Reserved app-route slugs
(`admin`, `api`, `rsvp`, `schedule`, `activities`, `basecamp`, `login`,
`demo`) return **400**; autogen skips those names and existing trips. See
`RESERVED_SLUGS` in `lib/slug.ts`. Unauthenticated create is rate-limited per
IP.

`PATCH` applies [JSON Merge Patch](https://datatracker.ietf.org/doc/html/rfc7396)
to `content` (`null` deletes a key; arrays replace). A full document still
works. Validation errors return `{ error, issues: [{ path, message, hint }] }`.

List/create/get responses include both `trips`/`trip` (canonical) and
`parties`/`party` (alias).

```bash
# Sparse create — name is enough; no deploy secret
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
| `/api/admin/trips` | POST | Create — `siteName` is enough. No auth. 400 if reserved; 409 if the slug exists. |
| `/api/admin/trips/:slug` | GET | Full record, including password + content |
| `/api/admin/trips/:slug` | PATCH | Merge-patch `content` and/or replace `password` |
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
npm run bigsend -- schedule add e2e-smoke --day 2026-09-05 --title "Dinner" --key-event
npm run bigsend -- get e2e-smoke
npm run bigsend -- guests e2e-smoke
npm run bigsend -- delete e2e-smoke --yes
```

`create --file party.json` accepts the old seed shape (`slug`, `password`,
`content`). `delete` requires `--yes`. Full usage: `npm run bigsend -- --help`.

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

Tools: `create`, `get`, `set`, `lodging_set`, `schedule_add`, `activities_add`,
`guests`, `password`, `delete` (`yes: true` required).
