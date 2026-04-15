"use client";

import { useActionState } from "react";
import { FormError, FormNotice } from "@/components/FormError";
import { sendBroadcastAction, type BroadcastState } from "./actions";

type HistoryRow = {
  id: string;
  subject: string;
  scope: string;
  sentAt: string;
  successCount: number;
  failureCount: number;
  authorName: string;
};

export function BroadcastClient({ history }: { history: HistoryRow[] }) {
  const [state, formAction, pending] = useActionState<BroadcastState, FormData>(
    sendBroadcastAction,
    {}
  );

  return (
    <div className="mt-6 space-y-10">
      <section className="rounded-lg border border-neutral-200 p-6">
        <h2 className="font-semibold mb-4">Compose</h2>
        <FormError message={state.error} />
        <FormNotice message={state.notice} />
        <form action={formAction} className="mt-3 space-y-3">
          <input
            name="subject"
            placeholder="Subject"
            required
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
          <textarea
            name="body"
            placeholder="Message body (plain text or basic HTML)"
            required
            rows={8}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
          />
          <select
            name="scope"
            required
            defaultValue="ALL_REGISTERED"
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          >
            <option value="ALL_REGISTERED">All registered teams</option>
            <option value="ALL_COMPLETE">All complete teams (2 members)</option>
            <option value="FINALISTS">Finalist teams only</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="alsoArchive" value="yes" defaultChecked />
            <span>Also archive as public announcement</span>
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800 disabled:opacity-60"
          >
            {pending ? "Sending…" : "Send broadcast"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-semibold mb-4">History</h2>
        <div className="space-y-3">
          {history.length === 0 && (
            <p className="text-sm text-neutral-500">No broadcasts yet.</p>
          )}
          {history.map((h) => (
            <div key={h.id} className="rounded-lg border border-neutral-200 p-4 bg-white">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{h.subject}</div>
                  <div className="text-xs text-neutral-500 mt-1">
                    {new Date(h.sentAt).toLocaleString()} · {h.authorName} · {h.scope}
                  </div>
                </div>
                <div className="text-xs">
                  <span className="text-green-700">{h.successCount} ✓</span>
                  {h.failureCount > 0 && (
                    <span className="ml-2 text-red-700">{h.failureCount} ✗</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
