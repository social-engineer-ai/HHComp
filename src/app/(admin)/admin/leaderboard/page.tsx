import { prisma } from "@/lib/db";
import { LeaderboardAdminClient } from "./LeaderboardAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminLeaderboardPage() {
  const [scores, settings, jobs, allCompleteTeams] = await Promise.all([
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
    prisma.team.findMany({
      where: { status: "COMPLETE" },
      include: { score: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Build a unified list: scored teams first (ordered by score), then unscored teams
  const scoredTeamIds = new Set(scores.map((s) => s.teamId));
  const unscored = allCompleteTeams
    .filter((t) => !scoredTeamIds.has(t.id))
    .map((t) => ({
      teamId: t.id,
      teamName: t.name,
      isFinalist: t.isFinalist,
    }));

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
          isFinalist: s.team.isFinalist,
          scoreValue: s.scoreValue,
          isManualOverride: s.isManualOverride,
          isLate: s.submission.isLate,
          scoredAt: s.scoredAt.toISOString(),
        }))}
        unscoredTeams={unscored}
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
