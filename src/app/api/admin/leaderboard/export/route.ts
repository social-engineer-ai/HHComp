import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scores = await prisma.score.findMany({
    orderBy: { scoreValue: "asc" },
    include: { team: { include: { members: { include: { user: true } } } }, submission: true },
  });

  const rows: string[] = [];
  rows.push("rank,team,wmape,late,override,scored_at,members");
  scores.forEach((s, i) => {
    const members = s.team.members.map((m) => `${m.user.name} <${m.user.email}>`).join("; ");
    rows.push(
      [
        i + 1,
        JSON.stringify(s.team.name),
        s.scoreValue.toFixed(6),
        s.submission.isLate ? "true" : "false",
        s.isManualOverride ? "true" : "false",
        s.scoredAt.toISOString(),
        JSON.stringify(members),
      ].join(",")
    );
  });

  return new NextResponse(rows.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="leaderboard-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
