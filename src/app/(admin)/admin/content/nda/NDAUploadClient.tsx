"use client";

import { useActionState } from "react";
import { FormError, FormNotice } from "@/components/FormError";
import { uploadNDAAction, type NDAUploadState } from "./actions";

type FileRow = {
  id: string;
  filename: string;
  sha256: string;
  uploadedAt: string;
  uploadedBy: string;
  isActive: boolean;
};

export function NDAUploadClient({ files }: { files: FileRow[] }) {
  const [state, formAction, pending] = useActionState<NDAUploadState, FormData>(
    uploadNDAAction,
    {}
  );

  return (
    <div className="mt-8 space-y-8">
      <section className="rounded-lg border border-neutral-200 p-6">
        <h2 className="font-semibold mb-4">Upload / replace NDA PDF</h2>
        <FormError message={state.error} />
        <FormNotice message={state.notice} />
        <form action={formAction} className="mt-3 space-y-3" encType="multipart/form-data">
          <input
            name="file"
            type="file"
            accept="application/pdf"
            required
            className="block w-full text-sm"
          />
          <input
            name="description"
            type="text"
            placeholder="Description (optional)"
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800 disabled:opacity-60"
          >
            {pending ? "Uploading…" : "Upload NDA"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-semibold mb-4">Versions</h2>
        <div className="space-y-3">
          {files.length === 0 && <p className="text-sm text-neutral-500">No NDA uploaded yet.</p>}
          {files.map((f) => (
            <div key={f.id} className="rounded-lg border border-neutral-200 p-4 bg-white">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{f.filename}</div>
                  <div className="text-xs text-neutral-500 mt-1">
                    Uploaded {new Date(f.uploadedAt).toLocaleString()} by {f.uploadedBy}
                  </div>
                  <div className="text-xs font-mono text-neutral-500 mt-1">
                    SHA-256: {f.sha256}
                  </div>
                </div>
                {f.isActive && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                    ACTIVE
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
