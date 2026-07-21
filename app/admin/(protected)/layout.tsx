import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, cookieAuthenticatesAdmin } from "@/lib/admin-cookie-auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const expected = process.env.ADMIN_UI_PASSWORD;
  if (!expected) {
    // No admin password configured — deny all access
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <h1 className="text-lg font-bold">Admin UI not configured</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Set ADMIN_UI_PASSWORD in environment to enable the admin UI.
        </p>
      </div>
    );
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
