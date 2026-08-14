// Browser admin UI gate. The env key name is for operators only — never
// put it (or any other env var name) in public HTML or login errors.

export const ADMIN_UI_UNAVAILABLE_HEADING = "Admin isn't available";

export const ADMIN_LOGIN_ERROR = "Couldn't sign in.";

export function getAdminUiPassword(): string | undefined {
  return process.env.ADMIN_UI_PASSWORD || undefined;
}

export function logAdminUiUnconfigured(): void {
  console.error(
    "Admin UI is disabled because ADMIN_UI_PASSWORD is not set. Set it in the environment to enable /admin.",
  );
}
