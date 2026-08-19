"use server";

import { unlockHostTrip } from "@/lib/host-access";

export async function login(
  slug: string,
  _prevState: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  return unlockHostTrip(slug, String(formData.get("hostKey") ?? ""));
}
