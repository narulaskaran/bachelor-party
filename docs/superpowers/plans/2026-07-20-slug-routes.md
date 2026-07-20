# Per-party `/:slug` routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let organizers share `https://<deploy>/denver2k26` as the entry point for a specific party, replacing the generic `/login` + shared-password-only flow.

**Architecture:** A new dynamic route `app/[slug]/page.tsx` looks up the party by slug, checks whether the existing `AUTH_COOKIE` already authenticates that exact party, and either renders the party content (extracted into a shared `PartyView` component) or a slug-scoped login form. `/login` and the edge-middleware redirect-to-login are removed since every route now gates itself.

**Tech Stack:** Next.js App Router (Server Components + Server Actions), Drizzle ORM, Vitest.

## Global Constraints

- Password stays required — visiting `/:slug` never bypasses auth (spec: "Password still required").
- Cookie format (`<partyId>.<hash>`, `lib/auth.ts`) does not change — `getCurrentParty`, `app/layout.tsx`, and `lib/rsvp-actions.ts` must keep working untouched.
- No-DB demo mode is bound to the fixed slug `/demo` (spec: "No-DB / demo mode").
- This plan does not touch `/api/admin/**` or the landing-page rework — those are out of scope (spec: "Out of scope").

---

### Task 1: Extract a testable cookie/party auth check

**Files:**
- Create: `lib/party-auth.ts`
- Test: `lib/__tests__/party-auth.test.ts`

**Interfaces:**
- Produces: `cookieAuthenticatesParty(rawCookie: string | undefined, partyId: number | "demo", password: string): Promise<boolean>` — pure function, no DB/cookies() dependency, used by both `lib/current-party.ts` (Task 2) and `app/[slug]/page.tsx` (Task 4).

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/party-auth.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { authCookieValue } from "@/lib/auth";
import { cookieAuthenticatesParty } from "@/lib/party-auth";

describe("cookieAuthenticatesParty", () => {
  it("returns false when no cookie is present", async () => {
    const result = await cookieAuthenticatesParty(undefined, 1, "secret");
    expect(result).toBe(false);
  });

  it("returns true when the cookie matches this party's id and password", async () => {
    const cookie = await authCookieValue(1, "secret");
    const result = await cookieAuthenticatesParty(cookie, 1, "secret");
    expect(result).toBe(true);
  });

  it("returns false when the cookie is for a different party id", async () => {
    const cookie = await authCookieValue(2, "secret");
    const result = await cookieAuthenticatesParty(cookie, 1, "secret");
    expect(result).toBe(false);
  });

  it("returns false when the password has changed since the cookie was issued", async () => {
    const cookie = await authCookieValue(1, "old-secret");
    const result = await cookieAuthenticatesParty(cookie, 1, "new-secret");
    expect(result).toBe(false);
  });

  it("works with the 'demo' party id", async () => {
    const cookie = await authCookieValue("demo", "demo-pass");
    const result = await cookieAuthenticatesParty(cookie, "demo", "demo-pass");
    expect(result).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/party-auth.test.ts`
Expected: FAIL — `Cannot find module '@/lib/party-auth'` (or similar resolution error), since the file doesn't exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `lib/party-auth.ts`:

```ts
import { authCookieValue } from "@/lib/auth";

// Pure check: does this raw cookie value authenticate this specific party?
// No DB/cookies() dependency, so it's directly unit-testable.
export async function cookieAuthenticatesParty(
  rawCookie: string | undefined,
  partyId: number | "demo",
  password: string
): Promise<boolean> {
  if (!rawCookie) return false;
  return rawCookie === (await authCookieValue(partyId, password));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/party-auth.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/party-auth.ts lib/__tests__/party-auth.test.ts
git commit -m "feat: extract cookieAuthenticatesParty helper"
```

---

### Task 2: Refactor `getCurrentParty` to reuse the new helper

**Files:**
- Modify: `lib/current-party.ts`

**Interfaces:**
- Consumes: `cookieAuthenticatesParty` from Task 1 (exact signature above).
- Produces: `getCurrentParty()` — signature and return type (`Promise<CurrentParty | null>`) unchanged; this is a pure internal refactor, not a behavior change.

- [ ] **Step 1: Replace the two inline comparisons with the helper**

In `lib/current-party.ts`, add the import:

```ts
import { cookieAuthenticatesParty } from "@/lib/party-auth";
```

Replace:

```ts
    if (raw && raw === (await authCookieValue("demo", expected))) {
      return { partyId: "demo", content: DEMO_PARTY };
    }
    return null;
```

with:

```ts
    if (await cookieAuthenticatesParty(raw, "demo", expected)) {
      return { partyId: "demo", content: DEMO_PARTY };
    }
    return null;
```

Replace:

```ts
    if (!party) return null;
    if (raw !== (await authCookieValue(party.id, party.password))) return null;
    return { partyId: party.id, content: party.content };
```

with:

```ts
    if (!party) return null;
    if (!(await cookieAuthenticatesParty(raw, party.id, party.password))) return null;
    return { partyId: party.id, content: party.content };
```

The `authCookieValue` import in this file is now unused — remove it, keeping `AUTH_COOKIE`:

```ts
import { AUTH_COOKIE } from "@/lib/auth";
```

- [ ] **Step 2: Run the full test suite to confirm nothing broke**

Run: `npx vitest run`
Expected: PASS (all existing tests + the 5 new ones from Task 1)

- [ ] **Step 3: Run the build to confirm no unused-import/type errors**

Run: `npm run build`
Expected: Compiles successfully, no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add lib/current-party.ts
git commit -m "refactor: reuse cookieAuthenticatesParty in getCurrentParty"
```

---

### Task 3: Extract `PartyView` and simplify `app/page.tsx`'s logged-out state

**Files:**
- Create: `components/party-view.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Produces: `PartyView({ content: PartyContent }): JSX.Element` — used here and by `app/[slug]/page.tsx` in Task 4.
- Consumes: `getCurrentParty` (unchanged, from Task 2).

- [ ] **Step 1: Create the shared content component**

Create `components/party-view.tsx`:

```tsx
import { pollActivities } from "@/lib/party-types";
import type { PartyContent } from "@/lib/party-types";
import { Hero } from "@/components/sections/hero";
import { Glance } from "@/components/sections/glance";
import { ActionItems } from "@/components/sections/action-items";
import { ScheduleSection } from "@/components/sections/schedule";
import { ActivitiesSection } from "@/components/sections/activities";
import { BasecampSection } from "@/components/sections/basecamp";
import { RsvpSection } from "@/components/sections/rsvp";

export function PartyView({ content }: { content: PartyContent }) {
  return (
    <div className="mx-auto max-w-5xl px-4">
      <Hero trip={content.trip} />
      <Glance trip={content.trip} lodging={content.lodging} />
      <ActionItems actionItems={content.actionItems} />
      <ScheduleSection schedule={content.schedule} />
      <ActivitiesSection activities={content.activities} />
      <BasecampSection trip={content.trip} lodging={content.lodging} />
      <RsvpSection
        pollActivities={pollActivities(content)}
        airport={content.trip.airport}
      />

      <footer className="border-t border-border py-8 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {content.trip.location} · {content.trip.elevation} · {content.trip.dateLabel}
        </p>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Replace `app/page.tsx` with the extracted component + placeholder**

Replace the full contents of `app/page.tsx`:

```tsx
import { getCurrentParty } from "@/lib/current-party";
import { PartyView } from "@/components/party-view";

export const dynamic = "force-dynamic";

export default async function Page() {
  const current = await getCurrentParty();
  if (!current) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-5xl items-center justify-center px-4 text-center">
        <p className="text-muted-foreground">
          Use your party&rsquo;s link to view your trip.
        </p>
      </div>
    );
  }

  return <PartyView content={current.content} />;
}
```

- [ ] **Step 3: Run the build**

Run: `npm run build`
Expected: Compiles successfully.

- [ ] **Step 4: Manually verify root behaves correctly**

Run: `npm run dev`, visit `http://localhost:3000/`.
Expected (no `DATABASE_URL`, no `PARTY_PASSWORD` set): demo party content renders (unchanged from before this task).
Then set `PARTY_PASSWORD=test123` in `.env.local`, clear cookies, reload `/`.
Expected: placeholder text "Use your party's link to view your trip." renders instead of a redirect.

- [ ] **Step 5: Commit**

```bash
git add components/party-view.tsx app/page.tsx
git commit -m "refactor: extract PartyView, replace root's login redirect with a placeholder"
```

---

### Task 4: Build the `/:slug` route, login form, and action

**Files:**
- Create: `app/[slug]/page.tsx`
- Create: `app/[slug]/actions.ts`
- Create: `app/[slug]/party-login-form.tsx`

**Interfaces:**
- Consumes: `cookieAuthenticatesParty` (Task 1), `PartyView` (Task 3), `AUTH_COOKIE` / `authCookieValue` (`lib/auth.ts`, unchanged), `DEMO_PARTY` (`lib/demo-party.ts`, unchanged), `schema.parties` (`lib/db/schema.ts`, unchanged — has `slug`, `password`, `content`, `id` columns already).
- Produces: nothing consumed elsewhere — this is the leaf feature.

- [ ] **Step 1: Create the slug-scoped login action**

Create `app/[slug]/actions.ts`:

```ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { AUTH_COOKIE, authCookieValue } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";

const NINETY_DAYS = 60 * 60 * 24 * 90;

export async function login(
  slug: string,
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const attempt = String(formData.get("password") ?? "").trim();
  if (!attempt) return { error: "Enter the password." };

  const db = getDb();
  let cookieValue: string | null = null;

  if (db) {
    try {
      const [party] = await db
        .select({ id: schema.parties.id, password: schema.parties.password })
        .from(schema.parties)
        .where(and(eq(schema.parties.slug, slug), eq(schema.parties.password, attempt)))
        .limit(1);
      if (party) cookieValue = await authCookieValue(party.id, party.password);
    } catch (err) {
      console.error("login lookup failed", err);
      return { error: "Couldn't check that — try again in a minute." };
    }
  } else if (slug === "demo") {
    const expected = process.env.PARTY_PASSWORD;
    if (!expected) {
      return { error: "Site isn't configured yet. Ping the organizer." };
    }
    if (attempt === expected) {
      cookieValue = await authCookieValue("demo", expected);
    }
  }

  if (!cookieValue) {
    return { error: "Wrong password. Ask the group chat." };
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: NINETY_DAYS,
    path: "/",
  });

  redirect(`/${slug}`);
}
```

- [ ] **Step 2: Create the slug-scoped login form (client component)**

Create `app/[slug]/party-login-form.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginAction = (
  state: { error?: string },
  formData: FormData
) => Promise<{ error?: string }>;

export function PartyLoginForm({ loginAction }: { loginAction: LoginAction }) {
  const [state, formAction, isPending] = useActionState(loginAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          aria-invalid={state.error ? true : undefined}
        />
        {state.error ? (
          <p className="text-sm text-destructive">{state.error}</p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Checking…" : "Enter"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Create the route**

Create `app/[slug]/page.tsx`:

```tsx
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PartyView } from "@/components/party-view";
import { AUTH_COOKIE } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { DEMO_PARTY } from "@/lib/demo-party";
import { cookieAuthenticatesParty } from "@/lib/party-auth";
import type { PartyContent } from "@/lib/party-types";
import { login } from "./actions";
import { PartyLoginForm } from "./party-login-form";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

type ResolvedParty = {
  id: number | "demo";
  password: string;
  content: PartyContent;
};

export default async function Page({ params }: Params) {
  const { slug } = await params;
  const db = getDb();

  let party: ResolvedParty | null = null;

  if (db) {
    const [row] = await db
      .select({
        id: schema.parties.id,
        password: schema.parties.password,
        content: schema.parties.content,
      })
      .from(schema.parties)
      .where(eq(schema.parties.slug, slug))
      .limit(1);
    if (row) party = row;
  } else if (slug === "demo") {
    const expected = process.env.PARTY_PASSWORD;
    if (!expected) {
      // No password configured anywhere — demo is open, same as root today.
      return <PartyView content={DEMO_PARTY} />;
    }
    party = { id: "demo", password: expected, content: DEMO_PARTY };
  }

  if (!party) notFound();

  const raw = (await cookies()).get(AUTH_COOKIE)?.value;
  const authed = await cookieAuthenticatesParty(raw, party.id, party.password);

  if (!authed) {
    const loginWithSlug = login.bind(null, slug);
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-4 py-16">
        <Card className="w-full max-w-sm">
          <CardHeader className="items-center text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Private Trip
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold uppercase tracking-wide">
              Who Goes There
            </h1>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <PartyLoginForm loginAction={loginWithSlug} />
            <p className="text-center text-xs text-muted-foreground">
              Password&rsquo;s in the group chat.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <PartyView content={party.content} />;
}
```

- [ ] **Step 4: Run the build**

Run: `npm run build`
Expected: Compiles successfully, `/[slug]` appears in the route list.

- [ ] **Step 5: Manually verify the full flow**

Run: `npm run dev` (no `DATABASE_URL` set), set `PARTY_PASSWORD=test123` in `.env.local`, restart dev server.
- Visit `http://localhost:3000/demo` with no cookie → login form renders (not a redirect).
- Submit wrong password → "Wrong password. Ask the group chat." shown, form stays.
- Submit `test123` → redirected to `/demo`, party content renders.
- Reload `/demo` → content renders directly (no login form), confirming the auto-redirect-when-already-authenticated behavior.
- Visit `http://localhost:3000/not-a-real-slug` → Next.js 404 page.

- [ ] **Step 6: Commit**

```bash
git add app/\[slug\]/page.tsx app/\[slug\]/actions.ts app/\[slug\]/party-login-form.tsx
git commit -m "feat: add slug-scoped party route with its own login gate"
```

---

### Task 5: Remove `/login` and simplify `proxy.ts`

**Files:**
- Delete: `app/login/page.tsx`
- Delete: `app/login/actions.ts`
- Delete: `app/login/login-form.tsx`
- Delete: `proxy.ts`

**Interfaces:**
- Consumes: nothing (pure removal).
- Produces: nothing — confirms no other file still imports from `app/login/*` or relies on `proxy.ts`.

- [ ] **Step 1: Confirm nothing else references the files being deleted**

Run: `grep -rn "app/login\|from \"\\./login" --include="*.ts" --include="*.tsx" . | grep -v node_modules`
Expected: no output (already confirmed during planning — `app/login/*` is only referenced by itself).

- [ ] **Step 2: Delete the files**

```bash
rm -rf app/login
rm proxy.ts
```

- [ ] **Step 3: Run the build**

Run: `npm run build`
Expected: Compiles successfully — no dangling imports, route list no longer shows `/login`, no `ƒ Proxy (Middleware)` line.

- [ ] **Step 4: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (all tests, unaffected by this deletion).

- [ ] **Step 5: Manually verify no edge-redirect remains**

Run: `npm run dev`, clear cookies, visit `http://localhost:3000/login`.
Expected: Next.js 404 (falls through to `app/[slug]/page.tsx` with `slug="login"`, no matching party) — not a redirect loop, not a crash.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove /login and proxy.ts now that every route self-gates"
```

---

### Task 6: Final full verification and cleanup pass

**Files:** none (verification only)

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: PASS, all tests (existing `admin-auth` suite + new `party-auth` suite).

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Compiles successfully. Route list should show `/`, `/[slug]`, `/api/admin/*` and no longer show `/login` or the middleware line.

- [ ] **Step 4: Manual end-to-end pass with a real DB-backed party (if `DATABASE_URL` is available locally)**

- Use the admin API (`POST /api/admin/parties`) to create a test party with a known slug/password.
- Visit `/that-slug` logged out → login form.
- Wrong password → error, form stays.
- Correct password → redirected to `/that-slug`, content renders.
- Log into a second party at a different slug → first party's cookie is overwritten; revisiting the first party's slug shows its login form again (not auto-authenticated).
- Delete the test party via `DELETE /api/admin/parties/:slug` when done.

- [ ] **Step 5: Commit if anything was fixed during verification**

```bash
git add -A
git commit -m "fix: <describe whatever verification turned up, if anything>"
```
