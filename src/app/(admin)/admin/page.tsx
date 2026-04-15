import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [
    userCount,
    teamCount,
    completeTeams,
    ndaSignatures,
    submissions,
    scores,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.team.count(),
    prisma.team.count({ where: { status: "COMPLETE" } }),
    prisma.nDASignature.count(),
    prisma.submission.count({ where: { isLatest: true } }),
    prisma.score.count(),
  ]);

  const stats = [
    { label: "Registered students", value: userCount },
    { label: "Teams", value: teamCount },
    { label: "Complete teams (2/2)", value: completeTeams },
    { label: "NDA signatures", value: ndaSignatures },
    { label: "Submissions (latest per component)", value: submissions },
    { label: "Scored submissions", value: scores },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-neutral-600 mt-1">Live platform stats.</p>
      <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-neutral-200 bg-white p-5"
          >
            <div className="text-3xl font-bold">{s.value}</div>
            <div className="text-sm text-neutral-600 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
