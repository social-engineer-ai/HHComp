"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/AuthLayout";
import { FormError } from "@/components/FormError";
import { joinAction, type JoinState } from "./actions";

const initial: JoinState = {};

export default function JoinPage() {
  return <JoinClient />;
}

function JoinClient() {
  const params = useSearchParams();
  const [code, setCode] = useState("");
  const [state, formAction, pending] = useActionState(joinAction, initial);

  useEffect(() => {
    const c = params.get("code");
    if (c) setCode(c.toUpperCase());
  }, [params]);

  return (
    <AuthLayout
      title="Join a team"
      subtitle="You've been invited to join a team for the 2026 competition."
      footer={
        <>
          Don't have an invitation?{" "}
          <Link href="/register" className="text-red-700 underline">
            Register your own team
          </Link>
        </>
      }
    >
      <form action={formAction} className="space-y-4">
        <FormError message={state.error} />

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="code">
            Invitation code
          </label>
          <input
            id="code"
            name="code"
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 tracking-widest text-lg font-mono"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="name">
            Full name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
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
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
          <p className="text-xs text-neutral-500 mt-1">
            Must match the email your team lead invited.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="eligibility" value="yes" required className="mt-0.5" />
          <span>
            I confirm I am a currently enrolled Gies College of Business student.
          </span>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-red-700 px-4 py-2.5 font-semibold text-white hover:bg-red-800 disabled:opacity-60"
        >
          {pending ? "Joining…" : "Join team"}
        </button>
      </form>
    </AuthLayout>
  );
}
