import { notFound } from "next/navigation";
import { HostKeyBanner } from "@/components/host-key-banner";
import { OrganizerRoster } from "@/components/organizer-roster";
import { PartyView } from "@/components/party-view";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { HostEditor } from "@/components/host-editor";
import { HostScheduleView } from "@/components/host-schedule-view";
import { getHostGuests, getHostEditorState, hostSessionForSlug, publishHostDraft, saveHostDraft } from "@/lib/host-access";
import { resolvePartyBySlug } from "@/lib/resolve-party";
import { login } from "./actions";
import { HostLoginForm } from "./host-login-form";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export default async function HostPage({ params }: Params) {
  const { slug } = await params;
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
            <HostLoginForm loginAction={loginWithSlug} />
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
      <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">Private host workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Review the event your crew will trust</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Check every extracted fact, leave unknown logistics as TBD, make copy or presentation changes, preview the same draft, then explicitly publish.
          </p>
        </div>
        <HostKeyBanner slug={slug} />
        <HostEditor
          slug={slug}
          initial={editor.content}
          published={editor.published}
          sample={editor.sample}
          guestUrl={editor.guestUrl}
          save={saveHostDraft}
          publish={publishHostDraft}
        />
        <section aria-labelledby="preview-heading" className="rounded-xl border border-border bg-muted/20 p-4 sm:p-6">
          <div className="mb-2">
            <h2 id="preview-heading" className="text-xl font-semibold tracking-tight">Guest preview</h2>
            <p className="text-sm text-muted-foreground">This is the saved draft rendered in the same guest components. It never changes the published page until you press publish.</p>
          </div>
          {/* Preview is deliberately inert: never read or mutate a stale guest cookie. */}
          <PartyView content={editor.content} sample={true} slug={slug} />
        </section>
      </main>
      <HostScheduleView
        slug={slug}
        schedule={editor.content.schedule ?? []}
        sample={editor.sample}
      />
      <OrganizerRoster guests={guests} />
    </>
  );
}
