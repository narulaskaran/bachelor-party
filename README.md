# The Big Send

A reusable, password-gated logistics site for bachelor parties (or any group
trip). One deployment hosts any number of parties: each party lives in the
database with its own shared password, and whoever enters that password sees
that party's site — schedule, lodging, activities, and an RSVP form for
flights, dietary restrictions, and activity votes.

No real trip details live in this repo. Party content is seeded into the
database from local JSON files that stay out of git.

## Stack

- Next.js (App Router) + Tailwind CSS v4 + shadcn/ui
- Neon Postgres (via Vercel Marketplace integration) + Drizzle ORM
- Password-per-party gate (shared plaintext secrets, no accounts)

## How it works

- `parties` table: one row per trip — unique `slug`, unique `password`, and a
  `content` jsonb blob (see `lib/party-types.ts` for the shape).
- Login looks the password up in `parties`; the cookie binds the browser to
  that party. Guests, RSVPs, and votes are scoped per party.
- Without a `DATABASE_URL`, the site runs in demo mode with fictional
  placeholder content (`lib/demo-party.ts`), gated by the `PARTY_PASSWORD`
  env var if set.

## Local development

```bash
npm install
cp .env.example .env.local   # optional: set PARTY_PASSWORD for the demo gate
npm run dev
```

## Adding or updating a party

1. Write a party file under `party-data/` (gitignored). Shape:
   `{ "slug": "...", "password": "...", "content": { ... } }` — content shape
   in `lib/party-types.ts`, fictional example in `lib/demo-party.ts`.
2. Seed it:

```bash
DATABASE_URL='postgres://…' npm run seed party-data/my-party.json
```

Re-running updates the party in place (upsert by slug), so edit + reseed is
the content workflow.

## Database schema

Pushed automatically during the Vercel build (`npm run build` runs
`drizzle-kit push` whenever `DATABASE_URL` is present). No manual migrations.

## Environment variables

| Name | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection string (Vercel integration) |
| `PARTY_PASSWORD` | Demo-mode gate when no database is configured (optional) |
