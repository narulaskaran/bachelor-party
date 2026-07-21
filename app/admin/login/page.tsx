import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ADMIN_COOKIE, cookieAuthenticatesAdmin } from "@/lib/admin-cookie-auth";
import { AdminLoginForm } from "./admin-login-form";

export const dynamic = "force-dynamic";

export default async function Page() {
  const expected = process.env.ADMIN_UI_PASSWORD;
  if (expected) {
    const rawCookie = (await cookies()).get(ADMIN_COOKIE)?.value;
    if (rawCookie && (await cookieAuthenticatesAdmin(rawCookie, expected))) {
      redirect("/admin");
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Admin
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold uppercase tracking-wide">
            Sign In
          </h1>
        </CardHeader>
        <CardContent>
          <AdminLoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
