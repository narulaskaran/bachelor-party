# The Big Send

A reusable, password-gated logistics site for group trips. One deployment hosts any number of parties: each party lives in the
database with its own shared password, and whoever enters that password sees
that party's site — schedule, lodging, activities, and an RSVP form for
flights, dietary restrictions, and activity votes.

No real trip details live in this repo. Party content is managed through the
admin API described below.

## Managing parties via the admin API

Parties are created and updated through `/api/admin/**` — a bearer-token-gated
REST API meant for scripts and AI agents, not browsers. Create with the global
`ADMIN_API_TOKEN`. After create, the response includes an **organizer packet**
(`url`, `slug`, `password`, `adminToken`). The per-party `adminToken` authorizes
every `/:slug` route for that trip (GET/PATCH/DELETE and guests). It cannot
list all parties or create another one.

The only required field on create is `content.trip.siteName`. Slug and guest
password autogenerate when omitted. `POST` is create-only: a colliding slug
returns **409** (GET + PATCH instead of upsert).

`PATCH` applies [JSON Merge Patch](https://datatracker.ietf.org/doc/html/rfc7396)
to `content` (`null` deletes a key; arrays replace). A full document still
works. Validation errors return `{ error, issues: [{ path, message, hint }] }`.

```bash
# Sparse create — name is enough
curl https://your-deploy.vercel.app/api/admin/parties \
  -H "Authorization: Bearer $ADMIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":{"trip":{"siteName":"Jackson Hole '\''26"}}}'

# Merge-patch a Saturday dinner (use the packet's adminToken)
curl https://your-deploy.vercel.app/api/admin/parties/jackson-hole-26 \
  -X PATCH \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":{"schedule":[{"key":"saturday","date":"2026-09-05","weekday":"Saturday","label":"Dinner","timed":true,"entries":[{"title":"Dinner","time":"7:00 PM"}]}]}}'
```

Party content shape is defined in `lib/party-types.ts` and validated by
`lib/party-schema.ts`; a fictional example lives in `lib/demo-party.ts`.

| Route | Method | Does |
| --- | --- | --- |
| `/api/admin/parties` | GET | List parties (no passwords/content). Global token only. |
| `/api/admin/parties` | POST | Create — `siteName` is enough. 409 if the slug exists. |
| `/api/admin/parties/:slug` | GET | Full record, including password + content |
| `/api/admin/parties/:slug` | PATCH | Merge-patch `content` and/or replace `password` |
| `/api/admin/parties/:slug` | DELETE | Delete the party and its guest RSVPs |
| `/api/admin/parties/:slug/guests` | GET | List that party's RSVPs |
| `/api/admin/parties/:slug/guests/:id` | DELETE | Remove one guest RSVP |

Slug routes accept `Authorization: Bearer` of either `ADMIN_API_TOKEN` or that
party's `adminToken`. They are excluded from the site's login gate.
