import { prisma } from "@/lib/db";
import { LeaderboardAdminClient } from "./LeaderboardAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminLeaderboardPage() {
  const [scores, settings, jobs] = await Promise.all([
    prisma.score.findMany({
      orderBy: { scoreValue: "asc" },
      include: { team: true, submission: true },
    }),
    prisma.competitionSettings.findUnique({ where: { id: 1 } }),
    prisma.gradingJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { submission: { include: { team: true } } },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Leaderboard</h1>
      <p className="text-neutral-600 mt-1">
        Visibility: {settings?.leaderboardVisibility ?? "VISIBLE"}
      </p>
      <LeaderboardAdminClient
        visibility={settings?.leaderboardVisibility ?? "VISIBLE"}
        scores={scores.map((s, i) => ({
          rank: i + 1,
          id: s.id,
          teamId: s.teamId,
          teamName: s.team.name,
          scoreValue: s.scoreValue,
          isManualOverride: s.isManualOverride,
          isLate: s.submission.isLate,
          scoredAt: s.scoredAt.toISOString(),
        }))}
        recentJobs={jobs.map((j) => ({
          id: j.id,
          status: j.status,
          teamName: j.submission.team.name,
          createdAt: j.createdAt.toISOString(),
          finishedAt: j.finishedAt?.toISOString() ?? null,
          errorMessage: j.errorMessage,
        }))}
      />
    </div>
  );
}
