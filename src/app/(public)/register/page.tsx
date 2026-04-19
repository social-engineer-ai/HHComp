"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/AuthLayout";
import { FormError } from "@/components/FormError";
import { PasswordInput } from "@/components/PasswordInput";
import { registerAction, type RegisterState } from "./actions";

const initial: RegisterState = {};

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(registerAction, initial);

  return (
    <AuthLayout
      title="Register your team"
      subtitle="Create your Team Lead account. You'll invite a teammate in the next step."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-red-700 underline">
            Log in
          </Link>
        </>
      }
    >
      <form action={formAction} className="space-y-4">
        <FormError message={state.error} />

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="name">
            Full name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            minLength={2}
            maxLength={120}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="email">
            Illinois email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="yournetid@illinois.edu"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-600"
          />
          <p className="text-xs text-neutral-500 mt-1">
            Must be a currently enrolled Gies student with an @illinois.edu address.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="password">
            Password
          </label>
          <PasswordInput
            id="password"
            name="password"
            required
            minLength={8}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 pr-16 focus:outline-none focus:ring-2 focus:ring-red-600"
          />
          <p className="text-xs text-neutral-500 mt-1">At least 8 characters.</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="teamName">
            Team name
          </label>
          <input
            id="teamName"
            name="teamName"
            type="text"
            required
            minLength={2}
            maxLength={64}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="eligibility"
            value="yes"
            required
            className="mt-0.5"
          />
          <span>
            I confirm I am a currently enrolled student at Gies College of Business,
            University of Illinois Urbana-Champaign.
          </span>
        </label>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-red-700 px-4 py-2.5 font-semibold text-white hover:bg-red-800 disabled:opacity-60"
        >
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}
