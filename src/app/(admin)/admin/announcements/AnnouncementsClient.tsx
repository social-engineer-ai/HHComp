"use client";

import { useActionState } from "react";
import { FormError, FormNotice } from "@/components/FormError";
import {
  createAnnouncementAction,
  deleteAnnouncementAction,
  type AnnouncementState,
} from "./actions";

type Item = {
  id: string;
  title: string;
  body: string;
  authorName: string;
  createdAt: string;
};

export function AnnouncementsClient({ items }: { items: Item[] }) {
  const [state, formAction, pending] = useActionState<AnnouncementState, FormData>(
    createAnnouncementAction,
    {}
  );

  return (
    <div className="mt-8 space-y-10">
      <section className="rounded-lg border border-neutral-200 p-6">
        <h2 className="font-semibold mb-4">New announcement</h2>
        <FormError message={state.error} />
        <FormNotice message={state.notice} />
        <form action={formAction} className="space-y-3 mt-3">
          <input
            name="title"
            placeholder="Title"
            required
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
          <textarea
            name="body"
            placeholder="Body (Markdown)"
            required
            rows={6}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800 disabled:opacity-60"
          >
            {pending ? "Posting…" : "Post announcement"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-semibold mb-4">All announcements</h2>
        <div className="space-y-4">
          {items.length === 0 && (
            <p className="text-sm text-neutral-500">No announcements yet.</p>
          )}
          {items.map((a) => (
            <div
              key={a.id}
              className="rounded-lg border border-neutral-200 p-5 bg-white"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{a.title}</h3>
                  <div className="text-xs text-neutral-500 mt-1">
                    {new Date(a.createdAt).toLocaleString()} · {a.authorName}
                  </div>
                </div>
                <form action={deleteAnnouncementAction.bind(null, a.id)}>
                  <button className="text-xs text-red-700 underline">Delete</button>
                </form>
              </div>
              <pre className="text-sm text-neutral-700 mt-3 whitespace-pre-wrap font-sans">
                {a.body}
              </pre>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
