import Link from "next/link";
import { PartyForm } from "../party-form";

export default function NewPartyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">New party</h1>
        <Link href="/admin" className="text-sm text-muted-foreground underline underline-offset-4">
          ← Back to dashboard
        </Link>
      </div>
      <PartyForm mode="create" />
    </div>
  );
}
