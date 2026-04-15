import Link from "next/link";
import { requireUser, getTeamForUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { DashboardClient } from "./DashboardClient";
import { logoutAction } from "../logout/actions";

export default async function DashboardPage() {
  const user = await requireUser();
  const team = await getTeamForUser(user.id);

  const pendingInvitation = team
    ? await prisma.invitation.findFirst({
        where: { teamId: team.id, status: "PENDING" },
      })
    : null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="font-semibold">
            SCM Case Competition 2026
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-neutral-700 hover:text-neutral-900">
              Dashboard
            </Link>
            <Link href="/leaderboard" className="text-neutral-700 hover:text-neutral-900">
              Leaderboard
            </Link>
            <Link href="/announcements" className="text-neutral-700 hover:text-neutral-900">
              Announcements
            </Link>
            <form action={logoutAction}>
              <button className="text-neutral-600 hover:text-neutral-900 underline">
                Log out
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome, {user.name.split(" ")[0]}.
          </h1>
          <p className="text-neutral-600 mt-1">
            Your hub for registration, data, submissions, and scoring.
          </p>
        </div>

        <DashboardClient
          user={{ id: user.id, name: user.name, email: user.email }}
          team={
            team
              ? {
                  id: team.id,
                  name: team.name,
                  status: team.status,
                  leadUserId: team.leadUserId,
                  members: team.members.map((m) => ({
                    userId: m.userId,
                    role: m.role,
                    name: m.user.name,
                    email: m.user.email,
                  })),
                }
              : null
          }
          pendingInvitation={
            pendingInvitation
              ? {
                  code: pendingInvitation.code,
                  inviteeEmail: pendingInvitation.inviteeEmail,
                  expiresAt: pendingInvitation.expiresAt.toISOString(),
                }
              : null
          }
        />
      </main>
    </div>
  );
}
