"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/AuthLayout";
import { FormError, FormNotice } from "@/components/FormError";
import { PasswordInput } from "@/components/PasswordInput";
import { resetPasswordAction, type ResetState } from "./actions";

const initial: ResetState = {};

export function ResetPasswordForm() {
  const params = useSearchParams();
  const initialEmail = params.get("email") ?? "";
  const justSent = params.get("sent") === "1";
  const [email, setEmail] = useState(initialEmail);

  const [state, formAction, pending] = useActionState<ResetState, FormData>(
    resetPasswordAction,
    initial
  );

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Enter the 6-digit code we sent you, then choose a new password."
    >
      <form action={formAction} className="space-y-4">
        {justSent && !state.error && (
          <FormNotice message="If an account exists for that email, we just sent a 6-digit code. Check your inbox (and spam folder)." />
        )}
        <FormError message={state.error} />

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="code">
            6-digit code
          </label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            autoComplete="one-time-code"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 tracking-[0.4em] text-center text-lg"
          />
          <p className="text-xs text-neutral-500 mt-1">Expires after 15 minutes.</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="password">
            New password
          </label>
          <PasswordInput id="password" name="password" required minLength={8} />
          <p className="text-xs text-neutral-500 mt-1">At least 8 characters.</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="confirm">
            Confirm new password
          </label>
          <PasswordInput id="confirm" name="confirm" required minLength={8} />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-red-700 px-4 py-2.5 font-semibold text-white hover:bg-red-800 disabled:opacity-60"
        >
          {pending ? "Resetting…" : "Reset password"}
        </button>
      </form>

      <p className="mt-6 text-sm text-neutral-600">
        Didn't get a code?{" "}
        <Link href="/forgot-password" className="text-red-700 underline">
          Request a new one
        </Link>
      </p>
    </AuthLayout>
  );
}
