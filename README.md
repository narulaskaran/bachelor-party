# The Big Send

A reusable, password-gated logistics site for group trips. One deployment hosts
any number of trips: each lives in the database with its own shared password,
and whoever enters that password sees that trip's site — schedule, lodging,
activities, and an RSVP form.

No real trip details live in this repo. Organizers talk to the **admin API**
(curl, CLI, or an agent). Guests get the HTML page.

## Managing trips via the admin API

Canonical paths are `/api/admin/trips/**`. `/api/admin/parties/**` rewrites to
those handlers (alias for existing scripts). Machine-readable spec:
`GET /api/openapi.json` (unauthenticated). The database table is still
`parties`.

Create with the global `ADMIN_API_TOKEN`. The **201 organizer packet** is
`url`, `slug`, `password`, `adminToken`. That `adminToken` authorizes every
`/:slug` route for that trip. It cannot list all trips or create another one.

The only required field on create is `content.trip.siteName`. Slug and guest
password autogenerate when omitted. `POST` is create-only: a colliding slug
returns **409** (GET + PATCH instead of upsert).

`PATCH` applies [JSON Merge Patch](https://datatracker.ietf.org/doc/html/rfc7396)
to `content` (`null` deletes a key; arrays replace). A full document still
works. Validation errors return `{ error, issues: [{ path, message, hint }] }`.

List/create/get responses include both `trips`/`trip` (canonical) and
`parties`/`party` (alias).

```bash
# Sparse create — name is enough
curl https://your-deploy.vercel.app/api/admin/trips \
  -H "Authorization: Bearer $ADMIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":{"trip":{"siteName":"Jackson Hole '\''26"}}}'

# Merge-patch a Saturday dinner (use the packet's adminToken)
curl https://your-deploy.vercel.app/api/admin/trips/jackson-hole-26 \
  -X PATCH \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":{"schedule":[{"key":"saturday","date":"2026-09-05","weekday":"Saturday","label":"Dinner","timed":true,"entries":[{"title":"Dinner","time":"7:00 PM"}]}]}}'
```

Content shape: `lib/party-types.ts`, validated by `lib/party-schema.ts`. Demo:
`lib/demo-party.ts`. `GET /demo` serves that Alpine Weekend sample even when a
database is configured, so the guest site can be evaluated without creating a
trip. A real `demo` row in the database still wins.

| Route | Method | Does |
| --- | --- | --- |
| `/api/admin/trips` | GET | List trips (no passwords/content). Global token only. |
| `/api/admin/trips` | POST | Create — `siteName` is enough. 409 if the slug exists. |
| `/api/admin/trips/:slug` | GET | Full record, including password + content |
| `/api/admin/trips/:slug` | PATCH | Merge-patch `content` and/or replace `password` |
| `/api/admin/trips/:slug` | DELETE | Delete the trip and its guest RSVPs |
| `/api/admin/trips/:slug/guests` | GET | List that trip's RSVPs |
| `/api/admin/trips/:slug/guests/:id` | DELETE | Remove one guest RSVP |
| `/api/openapi.json` | GET | OpenAPI 3.1 (from the Zod schemas) |

`/api/admin/parties/**` is a rewrite onto the same trips handlers. Slug routes accept
`Authorization: Bearer` of either `ADMIN_API_TOKEN` or that trip's `adminToken`.

## `bigsend` CLI

HTTP-only (no `DATABASE_URL`). JSON on stdout; errors on stderr. After
`create`, the trip `adminToken` is stored in `~/.bigsend.json` (or
`BIGSEND_CONFIG`) so follow-up commands do not need the global token.

```bash
export BIGSEND_API_URL=https://your-deploy.vercel.app
export BIGSEND_TOKEN=$ADMIN_API_TOKEN

npm run bigsend -- create --name "E2E Smoke"
npm run bigsend -- schedule add e2e-smoke --day 2026-09-05 --title "Dinner"
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
        "BIGSEND_API_URL": "https://your-deploy.vercel.app",
        "BIGSEND_TOKEN": "your-admin-api-token"
      }
    }
  }
}
```

Tools: `create`, `get`, `set`, `lodging_set`, `schedule_add`, `activities_add`,
`guests`, `password`, `delete` (`yes: true` required).
