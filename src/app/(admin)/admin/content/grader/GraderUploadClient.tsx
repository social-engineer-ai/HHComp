"use client";

import { useActionState } from "react";
import { FormError, FormNotice } from "@/components/FormError";
import {
  uploadAnswerKeyAction,
  uploadGradingScriptAction,
  type GraderUploadState,
} from "./actions";

type Current = { filename: string; sha256: string; uploadedAt: string } | null;

export function GraderUploadClient({
  answerKey,
  script,
  hasDefaultsConfigured,
}: {
  answerKey: Current;
  script: Current;
  hasDefaultsConfigured: boolean;
}) {
  const [akState, akAction, akPending] = useActionState<GraderUploadState, FormData>(
    uploadAnswerKeyAction,
    {}
  );
  const [gsState, gsAction, gsPending] = useActionState<GraderUploadState, FormData>(
    uploadGradingScriptAction,
    {}
  );

  return (
    <div className="mt-8 space-y-8">
      <section className="rounded-lg border border-neutral-200 p-6">
        <h2 className="font-semibold">Answer key</h2>
        <p className="text-sm text-neutral-600 mt-1">
          Excel or CSV containing the actuals for the held-back parts. Never shown to students.
        </p>
        {answerKey && (
          <div className="mt-3 rounded-md bg-neutral-50 border border-neutral-200 p-3 text-sm">
            <div className="font-medium">{answerKey.filename}</div>
            <div className="text-xs text-neutral-500 mt-0.5">
              Uploaded {new Date(answerKey.uploadedAt).toLocaleString()}
            </div>
            <div className="text-xs font-mono text-neutral-400 mt-0.5">
              {answerKey.sha256.slice(0, 32)}…
            </div>
          </div>
        )}
        <FormError message={akState.error} />
        <FormNotice message={akState.notice} />
        <form action={akAction} className="mt-3 flex gap-2" encType="multipart/form-data">
          <input
            name="file"
            type="file"
            accept=".xlsx,.xls,.csv"
            required
            className="flex-1 text-sm"
          />
          <button
            className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
            disabled={akPending}
          >
            {akPending ? "Uploading…" : "Upload answer key"}
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-neutral-200 p-6">
        <h2 className="font-semibold">Grading script (optional)</h2>
        <p className="text-sm text-neutral-600 mt-1">
          Python script that takes prediction and answer-key file paths as argv and prints a JSON
          with {"{"}"score": &lt;number&gt;{"}"}. If none is uploaded, a built-in default wMAPE grader runs.
        </p>
        {script && (
          <div className="mt-3 rounded-md bg-neutral-50 border border-neutral-200 p-3 text-sm">
            <div className="font-medium">{script.filename}</div>
            <div className="text-xs text-neutral-500 mt-0.5">
              Uploaded {new Date(script.uploadedAt).toLocaleString()}
            </div>
          </div>
        )}
        <FormError message={gsState.error} />
        <FormNotice message={gsState.notice} />
        <form action={gsAction} className="mt-3 flex gap-2" encType="multipart/form-data">
          <input
            name="file"
            type="file"
            accept=".py"
            required
            className="flex-1 text-sm"
          />
          <button
            className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
            disabled={gsPending}
          >
            {gsPending ? "Uploading…" : "Upload script"}
          </button>
        </form>
      </section>

      {!hasDefaultsConfigured && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No answer key uploaded yet. Scoring will not run until one is configured.
        </div>
      )}
    </div>
  );
}
