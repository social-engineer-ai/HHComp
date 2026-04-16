"use client";

import { useActionState, useRef } from "react";
import { FormError, FormNotice } from "@/components/FormError";
import { uploadSubmissionAction, type SubmitState } from "./actions";
import type { SubmissionComponent } from "@prisma/client";

type Component = {
  key: SubmissionComponent;
  label: string;
  description: string;
  accept: string;
  maxMb: number;
};

type LatestEntry = {
  filename: string;
  uploadedAt: string;
  version: number;
  isLate: boolean;
  validationStatus: string;
  validationMessage: string | null;
};

export function SubmitClient({
  components,
  latest,
  history,
}: {
  components: Component[];
  latest: Record<string, LatestEntry>;
  history: {
    id: string;
    component: SubmissionComponent;
    filename: string;
    uploadedAt: string;
    version: number;
  }[];
}) {
  return (
    <div className="mt-8 space-y-6">
      {components.map((c) => (
        <ComponentZone
          key={c.key}
          component={c}
          latestEntry={latest[c.key]}
          history={history.filter((h) => h.component === c.key)}
        />
      ))}
    </div>
  );
}

function ComponentZone({
  component,
  latestEntry,
  history,
}: {
  component: Component;
  latestEntry?: LatestEntry;
  history: { id: string; filename: string; uploadedAt: string; version: number }[];
}) {
  const [state, formAction, pending] = useActionState<SubmitState, FormData>(
    uploadSubmissionAction,
    {}
  );
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <section className="rounded-lg border border-neutral-200 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{component.label}</h3>
          <p className="text-sm text-neutral-600 mt-1">{component.description}</p>
          <p className="text-xs text-neutral-500 mt-1">
            Max {component.maxMb} MB · {component.accept}
          </p>
        </div>
        {latestEntry && (
          <div className="text-right">
            <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-800">
              ✓ UPLOADED
            </span>
            {latestEntry.isLate && (
              <span className="ml-1 inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                LATE
              </span>
            )}
            {latestEntry.validationStatus === "INVALID_STRUCTURE" && (
              <span className="ml-1 inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                VALIDATION WARNING
              </span>
            )}
          </div>
        )}
      </div>

      {latestEntry && (
        <div className="mt-4 rounded-md bg-neutral-50 border border-neutral-200 p-3 text-sm">
          <div className="font-medium truncate">{latestEntry.filename}</div>
          <div className="text-xs text-neutral-500 mt-0.5">
            v{latestEntry.version} · {new Date(latestEntry.uploadedAt).toLocaleString()}
          </div>
          {latestEntry.validationMessage && (
            <div className="text-xs text-amber-700 mt-1">{latestEntry.validationMessage}</div>
          )}
        </div>
      )}

      <form
        ref={formRef}
        action={formAction}
        className="mt-4 space-y-2"
        encType="multipart/form-data"
      >
        <input type="hidden" name="component" value={component.key} />
        <FormError message={state.error} />
        <FormNotice message={state.notice} />
        <div className="flex flex-wrap items-center gap-2">
          <label
            className={`cursor-pointer rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 ${
              pending ? "pointer-events-none opacity-60" : ""
            }`}
          >
            {pending
              ? "Uploading…"
              : latestEntry
              ? `Replace ${component.label.toLowerCase()}`
              : `Choose ${component.label.toLowerCase()}`}
            <input
              ref={fileRef}
              name="file"
              type="file"
              accept={component.accept}
              required
              disabled={pending}
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  // Auto-submit as soon as the user picks a file
                  formRef.current?.requestSubmit();
                }
              }}
            />
          </label>
          <span className="text-xs text-neutral-500">
            Single click: pick a file and it uploads automatically.
          </span>
        </div>
      </form>

      {history.length > 0 && (
        <details className="mt-4">
          <summary className="text-xs text-neutral-500 cursor-pointer select-none">
            Version history ({history.length})
          </summary>
          <ul className="mt-2 text-xs text-neutral-500 space-y-1">
            {history.map((h) => (
              <li key={h.id}>
                v{h.version} · {h.filename} ·{" "}
                {new Date(h.uploadedAt).toLocaleString()}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
