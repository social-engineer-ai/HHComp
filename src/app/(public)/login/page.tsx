"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/AuthLayout";
import { FormError } from "@/components/FormError";
import { PasswordInput } from "@/components/PasswordInput";
import { loginAction, type LoginState } from "./actions";

const initial: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initial);

  return (
    <AuthLayout
      title="Log in"
      subtitle="Access your team dashboard."
      footer={
        <div className="flex items-center justify-between">
          <Link href="/register" className="text-red-700 underline">
            Create a team
          </Link>
          <Link href="/forgot-password" className="text-neutral-600 underline">
            Forgot password?
          </Link>
        </div>
      }
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
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="password">
            Password
          </label>
          <PasswordInput id="password" name="password" required />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-red-700 px-4 py-2.5 font-semibold text-white hover:bg-red-800 disabled:opacity-60"
        >
          {pending ? "Logging in…" : "Log in"}
        </button>
      </form>
    </AuthLayout>
  );
}
