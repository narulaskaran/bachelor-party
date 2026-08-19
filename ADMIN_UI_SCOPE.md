# Admin UI

Site-operator dashboard at `/admin`, gated by `ADMIN_UI_PASSWORD`. Separate
from guest passwords and from per-trip host keys.

## Shipped

- `/admin/login` — SHA-256 cookie (`bp_admin`), same pattern as party login
- `/admin` — read-only trip list (site name, date label, guest count, updated-at)

Trip content is not edited here. Hosts create trips on the homepage, pick
key events at `/:slug/host`, and change everything else via the admin API
(`docs/api.md`).

## Not built

An earlier plan sketched create/edit forms, a JSON textarea, a guest roster,
and a structured schedule editor. Those pages are not scheduled. This file
is not a backlog.
