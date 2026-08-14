import { ADMIN_UI_UNAVAILABLE_HEADING } from "@/lib/admin-ui";

/** Generic public page when the admin UI cannot be used. No config hints. */
export function AdminUnavailable() {
  return (
    <div className="mx-auto max-w-xl py-20 text-center">
      <h1 className="text-lg font-bold">{ADMIN_UI_UNAVAILABLE_HEADING}</h1>
    </div>
  );
}
