import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { HostScheduleView } from "@/components/host-schedule-view";
import { hostSessionForSlug } from "@/lib/host-access";
import { resolvePartyBySlug } from "@/lib/resolve-party";
import { login } from "./actions";
import { HostLoginForm } from "./host-login-form";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export default async function HostPage({ params }: Params) {
  const { slug } = await params;
  const resolved = await resolvePartyBySlug(slug);
  if (resolved.status === "missing") notFound();

  const content = resolved.content;
  const authed = await hostSessionForSlug(slug);

  if (!authed) {
    const loginWithSlug = login.bind(null, slug);
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-4 py-16">
        <Card className="w-full max-w-sm">
          <CardHeader className="items-center text-center">
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Host tools</h1>
            <p className="text-sm text-muted-foreground">
              Enter the host key from the organizer packet to pick key events.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <HostLoginForm loginAction={loginWithSlug} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <HostScheduleView
      slug={slug}
      schedule={content.schedule ?? []}
      sample={slug === "demo"}
    />
  );
}
