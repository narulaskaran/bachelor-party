# Hemil's Bachelor Party

Private logistics site for the boys — schedule, lodging, activities, and an RSVP
form for flights, dietary restrictions, and activity votes.

**Sep 4–7, 2026 · Tabernash, Colorado**

## Stack

- Next.js (App Router) + Tailwind CSS v4 + shadcn/ui
- Neon Postgres (via Vercel Marketplace integration) + Drizzle ORM
- Simple shared-password gate (no accounts)

## Local development

```bash
npm install
cp .env.example .env.local   # set PARTY_PASSWORD
npm run dev
```

Without `DATABASE_URL` the site fully works read-only; the RSVP form shows a
friendly "database not hooked up" error on submit.

## Editing trip content

All logistics (schedule, lodging, activities) live in one file: `lib/party.ts`.
Edit and redeploy — no database involved.

## Database

Guest submissions (flights, dietary, activity votes) are stored in Postgres.

1. Add the Neon integration to the Vercel project (provisions `DATABASE_URL`).
2. Pull env vars locally: `vercel env pull .env.local`
3. Push the schema: `npx drizzle-kit push`

## Environment variables

| Name | Purpose |
| --- | --- |
| `PARTY_PASSWORD` | Shared plaintext password for the site gate |
| `DATABASE_URL` | Neon Postgres connection string (Vercel integration) |
