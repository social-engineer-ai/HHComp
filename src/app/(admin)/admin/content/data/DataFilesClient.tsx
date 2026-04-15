"use client";

import { useActionState } from "react";
import { FormError, FormNotice } from "@/components/FormError";
import {
  uploadDataFileAction,
  toggleDataFileAction,
  deleteDataFileAction,
  toggleDataDownloadsAction,
  type DataUploadState,
} from "./actions";

type FileRow = {
  id: string;
  filename: string;
  description: string | null;
  fileType: string;
  fileSize: number;
  sha256: string;
  uploadedAt: string;
  uploadedBy: string;
  isActive: boolean;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DataFilesClient({
  files,
  downloadsEnabled,
}: {
  files: FileRow[];
  downloadsEnabled: boolean;
}) {
  const [uploadState, uploadAction, uploading] = useActionState<DataUploadState, FormData>(
    uploadDataFileAction,
    {}
  );
  const [toggleState, toggleAction, toggling] = useActionState<DataUploadState, FormData>(
    toggleDataDownloadsAction,
    {}
  );

  return (
    <div className="mt-8 space-y-10">
      <section className="rounded-lg border border-neutral-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-semibold">Data download visibility</h2>
            <p className="text-sm text-neutral-600 mt-1">
              {downloadsEnabled
                ? "Students who have completed NDA signing can download active files."
                : "Downloads are disabled. Toggle on at kickoff (April 20)."}
            </p>
          </div>
          <form action={toggleAction}>
            <button
              className={`rounded-md px-4 py-2 text-sm font-semibold ${
                downloadsEnabled
                  ? "bg-neutral-200 text-neutral-700 hover:bg-neutral-300"
                  : "bg-red-700 text-white hover:bg-red-800"
              }`}
              disabled={toggling}
            >
              {downloadsEnabled ? "Disable downloads" : "Enable downloads"}
            </button>
          </form>
        </div>
        <FormNotice message={toggleState.notice} />
        <FormError message={toggleState.error} />
      </section>

      <section className="rounded-lg border border-neutral-200 p-6">
        <h2 className="font-semibold mb-4">Upload file</h2>
        <FormError message={uploadState.error} />
        <FormNotice message={uploadState.notice} />
        <form action={uploadAction} className="mt-3 space-y-3" encType="multipart/form-data">
          <input
            name="file"
            type="file"
            required
            className="block w-full text-sm"
          />
          <select
            name="fileType"
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          >
            <option value="DATASET">Dataset</option>
            <option value="PREDICTION_TEMPLATE">Prediction template</option>
            <option value="COMPETITION_BRIEF">Competition brief</option>
          </select>
          <input
            name="description"
            type="text"
            placeholder="Description (shown to students)"
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
          <button
            type="submit"
            disabled={uploading}
            className="rounded-md bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800 disabled:opacity-60"
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-semibold mb-4">Files ({files.length})</h2>
        <div className="space-y-3">
          {files.length === 0 && (
            <p className="text-sm text-neutral-500">No data files uploaded.</p>
          )}
          {files.map((f) => (
            <div key={f.id} className="rounded-lg border border-neutral-200 p-4 bg-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{f.filename}</div>
                  {f.description && (
                    <div className="text-sm text-neutral-600 mt-1">{f.description}</div>
                  )}
                  <div className="text-xs text-neutral-500 mt-1">
                    {f.fileType} · {formatSize(f.fileSize)} ·{" "}
                    {new Date(f.uploadedAt).toLocaleString()} · {f.uploadedBy}
                  </div>
                  <div className="text-xs font-mono text-neutral-400 mt-1 truncate">
                    {f.sha256.slice(0, 32)}…
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      f.isActive ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {f.isActive ? "ACTIVE" : "INACTIVE"}
                  </span>
                  <form action={toggleDataFileAction.bind(null, f.id)}>
                    <button className="text-xs text-neutral-600 underline">
                      {f.isActive ? "Hide" : "Show"}
                    </button>
                  </form>
                  <form action={deleteDataFileAction.bind(null, f.id)}>
                    <button className="text-xs text-red-700 underline">Delete</button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
