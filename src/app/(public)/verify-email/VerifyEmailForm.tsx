"use client";

import { useActionState, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/AuthLayout";
import { FormError, FormNotice } from "@/components/FormError";
import {
  verifyEmailAction,
  resendVerificationAction,
  type VerifyState,
  type ResendState,
} from "./actions";

export function VerifyEmailForm() {
  const params = useSearchParams();
  const initialEmail = params.get("email") ?? "";
  const [email, setEmail] = useState(initialEmail);
  const [verifyState, verifyAction, verifying] = useActionState<VerifyState, FormData>(
    verifyEmailAction,
    {}
  );
  const [resendState, resendAction, resending] = useActionState<ResendState, FormData>(
    resendVerificationAction,
    {}
  );

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="Enter the 6-digit code we just sent to your inbox. If it doesn't arrive within a minute, check your spam or junk folder."
    >
      <form action={verifyAction} className="space-y-4">
        <FormError message={verifyState.error} />
        <FormNotice message={resendState.notice} />
        <FormError message={resendState.error} />

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
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
            className="w-full rounded-md border border-neutral-300 px-3 py-2 tracking-[0.4em] text-center text-lg"
          />
          <p className="text-xs text-neutral-500 mt-1">Expires after 15 minutes.</p>
        </div>

        <button
          type="submit"
          disabled={verifying}
          className="w-full rounded-md bg-red-700 px-4 py-2.5 font-semibold text-white hover:bg-red-800 disabled:opacity-60"
        >
          {verifying ? "Verifying…" : "Verify and continue"}
        </button>
      </form>

      <form action={resendAction} className="text-sm text-neutral-600">
        <input type="hidden" name="email" value={email} />
        <button
          type="submit"
          disabled={resending}
          className="text-red-700 underline disabled:opacity-60"
        >
          {resending ? "Sending…" : "Resend code"}
        </button>
      </form>
    </AuthLayout>
  );
}
