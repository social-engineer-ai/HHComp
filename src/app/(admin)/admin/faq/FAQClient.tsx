"use client";

import { useActionState } from "react";
import { FormError, FormNotice } from "@/components/FormError";
import { createFAQAction, deleteFAQAction, type FAQState } from "./actions";

type Item = { id: string; question: string; answer: string };

export function FAQClient({ items }: { items: Item[] }) {
  const [state, formAction, pending] = useActionState<FAQState, FormData>(
    createFAQAction,
    {}
  );

  return (
    <div className="mt-8 space-y-10">
      <section className="rounded-lg border border-neutral-200 p-6">
        <h2 className="font-semibold mb-4">New FAQ item</h2>
        <FormError message={state.error} />
        <FormNotice message={state.notice} />
        <form action={formAction} className="space-y-3 mt-3">
          <input
            name="question"
            placeholder="Question"
            required
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
          <textarea
            name="answer"
            placeholder="Answer (Markdown)"
            required
            rows={4}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800 disabled:opacity-60"
          >
            {pending ? "Adding…" : "Add FAQ item"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-semibold mb-4">Current items</h2>
        <div className="space-y-3">
          {items.length === 0 && (
            <p className="text-sm text-neutral-500">No FAQ items yet.</p>
          )}
          {items.map((f) => (
            <div key={f.id} className="rounded-lg border border-neutral-200 p-4 bg-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold">{f.question}</h3>
                  <p className="text-sm text-neutral-700 mt-1 whitespace-pre-wrap">
                    {f.answer}
                  </p>
                </div>
                <form action={deleteFAQAction.bind(null, f.id)}>
                  <button className="text-xs text-red-700 underline ml-4">Delete</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
