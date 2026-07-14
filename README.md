# The Big Send

A reusable, password-gated logistics site for bachelor parties (or any group
trip). One deployment hosts any number of parties: each party lives in the
database with its own shared password, and whoever enters that password sees
that party's site — schedule, lodging, activities, and an RSVP form for
flights, dietary restrictions, and activity votes.

No real trip details live in this repo. Party content is managed through the
admin API described below.

## Managing parties via the admin API

Parties are created and updated through `/api/admin/**` — a bearer-token-gated
REST API meant for scripts and AI agents, not browsers. `ADMIN_API_TOKEN` is
already set as an environment variable on this deployment, so it's ready to
use.

```bash
curl https://your-deploy.vercel.app/api/admin/parties \
  -H "Authorization: Bearer $ADMIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d @party.json
```

Party content shape (the `content` field above) is defined in
`lib/party-types.ts` and validated by `lib/party-schema.ts`; a fictional
example lives in `lib/demo-party.ts`.

| Route | Method | Does |
| --- | --- | --- |
| `/api/admin/parties` | GET | List parties (no passwords/content) |
| `/api/admin/parties` | POST | Create a party — 409 if the slug exists |
| `/api/admin/parties/:slug` | GET | Full record, including password + content |
| `/api/admin/parties/:slug` | PATCH | Update `password` and/or `content` |
| `/api/admin/parties/:slug` | DELETE | Delete the party and its guest RSVPs |
| `/api/admin/parties/:slug/guests` | GET | List that party's RSVPs |
| `/api/admin/parties/:slug/guests/:id` | DELETE | Remove one guest RSVP |

All routes require `Authorization: Bearer $ADMIN_API_TOKEN` and are excluded
from the site's login gate (they have their own auth).
