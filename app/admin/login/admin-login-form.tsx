"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminLogin } from "./actions";

export function AdminLoginForm() {
  const [state, formAction, isPending] = useActionState(adminLogin, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "admin-login-error" : undefined}
        />
        {state.error ? (
          <p id="admin-login-error" className="text-sm text-destructive" role="alert">
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
