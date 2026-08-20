"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, adminCookieValue } from "@/lib/admin-cookie-auth";
import {
  ADMIN_LOGIN_ERROR,
  getAdminUiPassword,
  logAdminUiUnconfigured,
} from "@/lib/admin-ui";
import { sessionCookieOptions } from "@/lib/cookie-hash";

export async function adminLogin(
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const attempt = String(formData.get("password") ?? "").trim();
  if (!attempt) return { error: "Enter the password." };

  const expected = getAdminUiPassword();
  if (!expected) {
    logAdminUiUnconfigured();
    return { error: ADMIN_LOGIN_ERROR };
  }

  if (attempt !== expected) {
    return { error: ADMIN_LOGIN_ERROR };
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, await adminCookieValue(expected), sessionCookieOptions());

  redirect("/admin");
}
