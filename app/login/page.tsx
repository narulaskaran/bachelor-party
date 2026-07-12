import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const params = await searchParams;
  const fromParam = Array.isArray(params.from) ? params.from[0] : params.from;
  const from = fromParam && fromParam.startsWith("/") ? fromParam : "/";

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Private Trip
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold uppercase tracking-wide">
            Who Goes There
          </h1>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <LoginForm from={from} />
          <p className="text-center text-xs text-muted-foreground">
            Password&rsquo;s in the group chat.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
