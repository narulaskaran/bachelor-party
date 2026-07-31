"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, adminCookieValue } from "@/lib/admin-cookie-auth";

const NINETY_DAYS = 60 * 60 * 24 * 90;

export async function adminLogin(
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const attempt = String(formData.get("password") ?? "").trim();
  if (!attempt) return { error: "Enter the password." };

  const expected = process.env.ADMIN_UI_PASSWORD;
  if (!expected) {
    return { error: "Admin UI isn't configured. Set ADMIN_UI_PASSWORD." };
  }

  if (attempt !== expected) {
    return { error: "Wrong password." };
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, await adminCookieValue(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: NINETY_DAYS,
    path: "/",
  });

  redirect("/admin");
}
