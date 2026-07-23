"use server";

// Server actions for the admin party create/edit form (Phase 2). These call
// getDb() + schema.parties directly — same data layer app/api/admin/parties/**
// uses — rather than the UI calling its own API over HTTP. Auth is already
// resolved by app/admin/(protected)/layout.tsx before any of this renders.

import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/lib/db";
import { createPartySchema, updatePartySchema } from "@/lib/party-schema";

export type PartyFormState = {
  error?: string;
  issues?: string[];
};

function parseContent(formData: FormData): { content?: unknown; error?: string } {
  const raw = String(formData.get("content") ?? "");
  try {
    return { content: JSON.parse(raw) };
  } catch {
    return { error: "Content is not valid JSON — check the schedule/activities fields." };
  }
}

export async function createPartyAction(
  _prevState: PartyFormState,
  formData: FormData
): Promise<PartyFormState> {
  const db = getDb();
  if (!db) return { error: "Database not configured." };

  const { content, error: parseError } = parseContent(formData);
  if (parseError) return { error: parseError };

  const parsed = createPartySchema.safeParse({
    slug: String(formData.get("slug") ?? ""),
    password: String(formData.get("password") ?? ""),
    content,
  });
  if (!parsed.success) {
    return {
      error: "Invalid party payload.",
      issues: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    };
  }

  const [existing] = await db
    .select({ id: schema.parties.id })
    .from(schema.parties)
    .where(eq(schema.parties.slug, parsed.data.slug))
    .limit(1);
  if (existing) return { error: `Party with slug '${parsed.data.slug}' already exists.` };

  const [passwordConflict] = await db
    .select({ id: schema.parties.id })
    .from(schema.parties)
    .where(eq(schema.parties.password, parsed.data.password))
    .limit(1);
  if (passwordConflict) return { error: "Password already in use by another party." };

  const adminToken = randomBytes(16).toString("hex");

  try {
    await db.insert(schema.parties).values({ ...parsed.data, adminToken });
  } catch (err) {
    console.error("create party failed", err);
    return { error: "Failed to create party." };
  }

  redirect("/admin");
}

export async function updatePartyAction(
  slug: string,
  _prevState: PartyFormState,
  formData: FormData
): Promise<PartyFormState> {
  const db = getDb();
  if (!db) return { error: "Database not configured." };

  const { content, error: parseError } = parseContent(formData);
  if (parseError) return { error: parseError };

  const rawPassword = String(formData.get("password") ?? "");

  const parsed = updatePartySchema.safeParse({
    // Empty password field means "leave unchanged" — omit it from the update.
    ...(rawPassword ? { password: rawPassword } : {}),
    content,
  });
  if (!parsed.success) {
    return {
      error: "Invalid party payload.",
      issues: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    };
  }

  if (parsed.data.password) {
    const [conflict] = await db
      .select({ slug: schema.parties.slug })
      .from(schema.parties)
      .where(eq(schema.parties.password, parsed.data.password))
      .limit(1);
    if (conflict && conflict.slug !== slug) {
      return { error: "Password already in use by another party." };
    }
  }

  try {
    const [party] = await db
      .update(schema.parties)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(schema.parties.slug, slug))
      .returning();
    if (!party) return { error: "Party not found." };
  } catch (err) {
    console.error("update party failed", err);
    return { error: "Failed to update party." };
  }

  redirect("/admin");
}
