"use client";

import { useActionState } from "react";
import { FormError, FormNotice } from "@/components/FormError";
import { submitQueryAction, type ContactState } from "./actions";

export function ContactForm() {
  const [state, formAction, pending] = useActionState<ContactState, FormData>(
    submitQueryAction,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <FormNotice message={state.notice} />

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="name">
          Your name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          minLength={2}
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="email">
          Your email
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
          We'll reply to this address.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="message">
          Your question
        </label>
        <textarea
          id="message"
          name="message"
          required
          minLength={10}
          rows={5}
          placeholder="What would you like to know about the competition?"
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-red-700 px-4 py-2.5 font-semibold text-white hover:bg-red-800 disabled:opacity-60"
      >
        {pending ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}
