"use client";

import { useActionState } from "react";
import { FormError } from "@/components/FormError";
import { signNDAAction, type SignState } from "./actions";

export function NDASignClient({ registeredName }: { registeredName: string }) {
  const [state, formAction, pending] = useActionState<SignState, FormData>(
    signNDAAction,
    {}
  );

  return (
    <form action={formAction} className="rounded-lg border border-neutral-200 p-6 space-y-4">
      <FormError message={state.error} />

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="typedName">
          Type your full legal name to acknowledge the NDA
        </label>
        <input
          id="typedName"
          name="typedName"
          type="text"
          required
          placeholder={registeredName}
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
        />
        <p className="text-xs text-neutral-500 mt-1">
          Must match your registered name: <strong>{registeredName}</strong>
        </p>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="agree" value="yes" required className="mt-0.5" />
        <span>I have read the NDA in its entirety and agree to be bound by its terms.</span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-red-700 px-4 py-2.5 font-semibold text-white hover:bg-red-800 disabled:opacity-60"
      >
        {pending ? "Signing…" : "Sign NDA"}
      </button>
    </form>
  );
}
