import Link from "next/link";
import { requireUser, getTeamForUser } from "@/lib/auth/guards";
import { getNDAStatusForUser } from "@/lib/nda";
import { prisma } from "@/lib/db";
import { logoutAction } from "../logout/actions";

export const dynamic = "force-dynamic";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function DataPage() {
  const user = await requireUser();
  const team = await getTeamForUser(user.id);
  const ndaStatus = await getNDAStatusForUser(user.id, team?.id);
  const settings = await prisma.competitionSettings.findUnique({ where: { id: 1 } });

  const downloadsEnabled = settings?.dataDownloadsEnabled ?? false;
  const canDownload = ndaStatus.teamSignedAll && downloadsEnabled;

  const files = canDownload
    ? await prisma.dataFile.findMany({
        where: {
          isActive: true,
          fileType: { in: ["DATASET", "PREDICTION_TEMPLATE", "COMPETITION_BRIEF"] },
        },
        orderBy: [{ fileType: "asc" }, { displayOrder: "asc" }],
      })
    : [];

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="font-semibold">
            SCM Analytics Competition 2026
          </Link>
          <form action={logoutAction}>
            <button className="text-sm text-neutral-600 underline">Log out</button>
          </form>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Data downloads</h1>
        <p className="mt-2 text-neutral-600">
          Confidential. For competition use only, subject to the signed NDA.
        </p>

        {!canDownload ? (
          <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
            <div className="font-semibold">Downloads are locked</div>
            <p className="text-sm mt-1">
              {!downloadsEnabled
                ? "The organizers have not yet released the data. Check back after the April 20 kickoff."
                : `Both team members must sign the NDA first (${ndaStatus.teamSignedCount} of ${ndaStatus.teamTotalCount} signed).`}
            </p>
            {!ndaStatus.teamSignedAll && ndaStatus.activeFile && (
              <Link href="/nda" className="mt-3 inline-block text-sm underline">
                Go to NDA signing
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            {files.length === 0 && (
              <p className="text-sm text-neutral-500">
                No files are currently published. Check back soon.
              </p>
            )}
            {files.map((f) => (
              <div
                key={f.id}
                className="rounded-lg border border-neutral-200 p-4 bg-white flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="font-semibold truncate">{f.filename}</div>
                  {f.description && (
                    <div className="text-sm text-neutral-600 mt-1">{f.description}</div>
                  )}
                  <div className="text-xs text-neutral-500 mt-1">
                    {f.fileType.replace("_", " ")} · {formatSize(f.fileSize)}
                  </div>
                </div>
                <a
                  href={`/api/download/${f.id}`}
                  className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
