import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { logoutAction } from "../logout/actions";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const user = await requireUser();
  const settings = await prisma.competitionSettings.findUnique({ where: { id: 1 } });

  if (settings?.leaderboardVisibility === "HIDDEN" && user.role === "STUDENT") {
    return (
      <div className="p-10 max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold">Leaderboard</h1>
        <p className="mt-3 text-neutral-600">
          The leaderboard is currently hidden by the organizers.
        </p>
        <Link href="/dashboard" className="text-red-700 underline mt-4 inline-block">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const frozen = settings?.leaderboardVisibility === "FROZEN";
  let scores = await prisma.score.findMany({
    orderBy: { scoreValue: "asc" }, // lower wMAPE is better
    include: { team: true, submission: true },
    take: settings?.leaderboardTopN ?? undefined,
  });
  if (frozen && user.role === "STUDENT") {
    scores = [];
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="font-semibold">
            SCM Case Competition 2026
          </Link>
          <form action={logoutAction}>
            <button className="text-sm text-neutral-600 underline">Log out</button>
          </form>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Leaderboard</h1>
            <p className="text-neutral-600 mt-1">
              Weighted MAPE (lower is better) · latest submission scored.
            </p>
          </div>
          {frozen && (
            <span className="inline-block text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-800">
              FROZEN
            </span>
          )}
        </div>

        {frozen && user.role === "STUDENT" && (
          <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-6 text-blue-900">
            The leaderboard is frozen pending finalist notification. Scores will be revealed after organizers unfreeze.
          </div>
        )}

        {!frozen && (
          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left">
                <tr>
                  <th className="px-4 py-2 font-semibold w-16">Rank</th>
                  <th className="px-4 py-2 font-semibold">Team</th>
                  <th className="px-4 py-2 font-semibold text-right">wMAPE</th>
                  <th className="px-4 py-2 font-semibold">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {scores.map((s, i) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-semibold">#{i + 1}</td>
                    <td className="px-4 py-3">
                      {s.team.name}
                      {s.isManualOverride && (
                        <span className="ml-2 text-xs text-neutral-500">(adjusted)</span>
                      )}
                      {s.team.isFinalist && (
                        <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                          FINALIST
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {s.scoreValue.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-neutral-500 text-xs">
                      {new Date(s.submission.uploadedAt).toLocaleString()}
                      {s.submission.isLate && (
                        <span className="ml-1 text-xs font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-800">
                          LATE
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {scores.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
                      No scored submissions yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
