"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/AuthLayout";
import { FormError } from "@/components/FormError";
import { forgotPasswordAction, type ForgotState } from "./actions";

const initial: ForgotState = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<ForgotState, FormData>(
    forgotPasswordAction,
    initial
  );

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email and we'll send you a 6-digit code to set a new password."
    >
      <form action={formAction} className="space-y-4">
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
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-red-700 px-4 py-2.5 font-semibold text-white hover:bg-red-800 disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send reset code"}
        </button>
      </form>

      <p className="mt-6 text-sm text-neutral-600">
        Remembered it?{" "}
        <Link href="/login" className="text-red-700 underline">
          Back to login
        </Link>
      </p>
    </AuthLayout>
  );
}
