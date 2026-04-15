"use client";

import { useActionState } from "react";
import { FormError, FormNotice } from "@/components/FormError";
import { updateSettingsAction, type SettingsState } from "./actions";

export function SettingsClient({
  initial,
}: {
  initial: {
    submissionDeadline: string;
    gracePeriodEnd: string;
    registrationClose: string;
  };
}) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    updateSettingsAction,
    {}
  );
  return (
    <form action={formAction} className="mt-6 space-y-4 max-w-xl">
      <FormError message={state.error} />
      <FormNotice message={state.notice} />
      <Field
        label="Submission deadline (primary)"
        name="submissionDeadline"
        defaultValue={initial.submissionDeadline}
      />
      <Field
        label="Grace period end"
        name="gracePeriodEnd"
        defaultValue={initial.gracePeriodEnd}
      />
      <Field
        label="Registration close"
        name="registrationClose"
        defaultValue={initial.registrationClose}
      />
      <p className="text-xs text-neutral-500">
        Times are interpreted in your browser&#39;s local timezone. Use Central Time when entering.
      </p>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="datetime-local"
        defaultValue={defaultValue}
        required
        className="w-full rounded-md border border-neutral-300 px-3 py-2"
      />
    </div>
  );
}
