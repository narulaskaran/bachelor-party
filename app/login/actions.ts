"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, hashPassword } from "@/lib/auth";

const NINETY_DAYS = 60 * 60 * 24 * 90;

export async function login(
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const attempt = String(formData.get("password") ?? "").trim();
  const expected = process.env.PARTY_PASSWORD;

  if (!expected) {
    return { error: "Site password isn't configured yet. Ping Kunal." };
  }
  if (attempt !== expected) {
    return { error: "Wrong password. Ask the group chat." };
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, await hashPassword(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: NINETY_DAYS,
    path: "/",
  });

  const from = String(formData.get("from") ?? "");
  redirect(from.startsWith("/") && !from.startsWith("//") ? from : "/");
}
