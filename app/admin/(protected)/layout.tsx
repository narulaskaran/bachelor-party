import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, cookieAuthenticatesAdmin } from "@/lib/admin-cookie-auth";
import { getAdminUiPassword, logAdminUiUnconfigured } from "@/lib/admin-ui";
import { AdminUnavailable } from "../admin-unavailable";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const expected = getAdminUiPassword();
  if (!expected) {
    logAdminUiUnconfigured();
    return <AdminUnavailable />;
  }

  // Check auth before rendering anything. Mirrors how app/[slug]/page.tsx
  // gates party access — resolve auth before rendering, no middleware.
  // Lives in a (protected) route group so /admin/login, a sibling route,
  // isn't wrapped by this layout and doesn't redirect-loop against itself.
  const rawCookie = (await cookies()).get(ADMIN_COOKIE)?.value;

  if (!rawCookie || !await cookieAuthenticatesAdmin(rawCookie, expected)) {
    redirect("/admin/login");
  }

  return <>{children}</>;
}
