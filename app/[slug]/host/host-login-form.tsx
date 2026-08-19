"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginAction = (
  state: { error?: string },
  formData: FormData,
) => Promise<{ error?: string }>;

export function HostLoginForm({ loginAction }: { loginAction: LoginAction }) {
  const [state, formAction, isPending] = useActionState(loginAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="hostKey">Host key</Label>
        <Input
          id="hostKey"
          name="hostKey"
          type="password"
          autoComplete="off"
          autoFocus
          required
          spellCheck={false}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "host-login-error" : undefined}
        />
        {state.error ? (
          <p id="host-login-error" className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Checking…" : "Enter"}
      </Button>
    </form>
  );
}
