"use server";

import { unlockGuestTrip } from "@/lib/guest-access";

export async function login(
  slug: string,
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  return unlockGuestTrip(slug, String(formData.get("password") ?? ""));
}
