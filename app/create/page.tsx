import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CreateTripForm } from "@/components/create-trip-form";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-4 py-16">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Host
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold uppercase tracking-wide">
            Create a trip
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Name it. We&rsquo;ll generate the invite link, guest password, and
            admin token.
          </p>
        </CardHeader>
        <CardContent>
          <CreateTripForm />
        </CardContent>
      </Card>
    </div>
  );
}
