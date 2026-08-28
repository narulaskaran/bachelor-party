import { notFound } from "next/navigation";
import { OrganizerRoster } from "@/components/organizer-roster";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { HostScheduleView } from "@/components/host-schedule-view";
import { HostWorkspace } from "@/components/host-workspace";
import { getHostGuests, getHostEditorState, hostSessionForSlug, publishHostDraft, saveHostDraft } from "@/lib/host-access";
import { resolvePartyBySlug } from "@/lib/resolve-party";
import { hasSchedule } from "@/lib/trip-sections";
import { login } from "./actions";
import { HostLoginForm } from "./host-login-form";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export default async function HostPage({ params }: Params) {
  const { slug } = await params;
  const isDemo = slug === "demo";
  const resolved = await resolvePartyBySlug(slug);
  if (resolved.status === "missing") notFound();

  const authed = await hostSessionForSlug(slug);
  if (!authed) {
    const loginWithSlug = login.bind(null, slug);
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-4 py-16">
        <Card className="w-full max-w-sm">
          <CardHeader className="items-center text-center">
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Host tools</h1>
            <p className="text-sm text-muted-foreground">
              Enter the host key from when you created this event. This is not the guest link.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <HostLoginForm loginAction={loginWithSlug} slug={slug} />
          </CardContent>
        </Card>
      </div>
    );
  }

  const editor = await getHostEditorState(slug);
  if (!editor.ok) notFound();
  const guests = await getHostGuests(slug);

  return (
    <>
      <HostWorkspace
        slug={slug}
        initial={editor.content}
        published={editor.published}
        publishStatus={editor.publishStatus}
        sample={isDemo}
        guestUrl={editor.guestUrl}
        publishedSnapshot={editor.publishedSnapshot}
        save={saveHostDraft}
        publish={publishHostDraft}
      />
      {hasSchedule(editor.content) ? (
        <HostScheduleView
          slug={slug}
          schedule={editor.content.schedule ?? []}
          sample={isDemo}
          guestHref={editor.guestUrl}
        />
      ) : null}
      <OrganizerRoster guests={guests} />
    </>
  );
}
