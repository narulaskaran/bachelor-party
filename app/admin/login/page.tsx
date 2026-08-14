import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ADMIN_COOKIE, cookieAuthenticatesAdmin } from "@/lib/admin-cookie-auth";
import { getAdminUiPassword, logAdminUiUnconfigured } from "@/lib/admin-ui";
import { AdminUnavailable } from "../admin-unavailable";
import { AdminLoginForm } from "./admin-login-form";

export const dynamic = "force-dynamic";

export default async function Page() {
  const expected = getAdminUiPassword();
  if (!expected) {
    logAdminUiUnconfigured();
    return <AdminUnavailable />;
  }

  const rawCookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (rawCookie && (await cookieAuthenticatesAdmin(rawCookie, expected))) {
    redirect("/admin");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sign in</h1>
        </CardHeader>
        <CardContent>
          <AdminLoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
