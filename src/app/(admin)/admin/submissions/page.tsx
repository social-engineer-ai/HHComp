import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function AdminSubmissionsPage() {
  const teams = await prisma.team.findMany({
    where: { status: "COMPLETE" },
    include: {
      members: { include: { user: true } },
      submissions: { where: { isLatest: true }, orderBy: { componentType: "asc" } },
      score: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const totalLatest = await prisma.submission.count({ where: { isLatest: true } });
  const totalLate = await prisma.submission.count({ where: { isLatest: true, isLate: true } });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Submissions</h1>
      <p className="text-neutral-600 mt-1">
        {teams.length} complete team{teams.length === 1 ? "" : "s"} ·{" "}
        {totalLatest} latest component uploads ·{" "}
        <span className="text-red-700">{totalLate} late</span>
      </p>

      <div className="mt-6 flex gap-2">
        <a
          href="/api/admin/submissions/export"
          className="rounded-md bg-neutral-100 hover:bg-neutral-200 px-4 py-2 text-sm font-semibold"
        >
          Download all as ZIP
        </a>
      </div>

      <div className="mt-8 space-y-4">
        {teams.map((t) => (
          <div key={t.id} className="rounded-lg border border-neutral-200 p-5 bg-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{t.name}</h3>
                <div className="text-xs text-neutral-500 mt-1">
                  {t.members.map((m) => m.user.name).join(", ")}
                </div>
              </div>
              <div className="text-right">
                {t.score ? (
                  <div className="text-lg font-mono font-semibold">
                    {t.score.scoreValue.toFixed(4)}
                  </div>
                ) : (
                  <div className="text-xs text-neutral-500">Not scored</div>
                )}
                {t.isFinalist && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                    FINALIST
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
              {(["PREDICTION", "CODE", "METHODOLOGY", "PRESENTATION"] as const).map((c) => {
                const s = t.submissions.find((x) => x.componentType === c);
                return (
                  <div
                    key={c}
                    className={`rounded-md p-2 border ${
                      s ? "border-green-200 bg-green-50" : "border-neutral-200 bg-neutral-50"
                    }`}
                  >
                    <div className="font-semibold">{c}</div>
                    {s ? (
                      <>
                        <div className="truncate">{s.originalFilename}</div>
                        <div className="text-neutral-500 mt-0.5">
                          {formatSize(s.fileSize)}
                          {s.isLate && <span className="ml-1 text-red-700">LATE</span>}
                        </div>
                        <a
                          href={`/api/admin/submissions/${s.id}/download`}
                          className="text-red-700 underline"
                        >
                          Download
                        </a>
                      </>
                    ) : (
                      <div className="text-neutral-500">—</div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-3">
              <FinalistToggle teamId={t.id} isFinalist={t.isFinalist} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { toggleFinalistAction } from "./actions";

function FinalistToggle({ teamId, isFinalist }: { teamId: string; isFinalist: boolean }) {
  return (
    <form action={toggleFinalistAction.bind(null, teamId)}>
      <button className="text-xs underline text-neutral-600">
        {isFinalist ? "Remove finalist" : "Mark as finalist"}
      </button>
    </form>
  );
}
