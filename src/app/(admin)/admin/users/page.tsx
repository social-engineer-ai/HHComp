import { prisma } from "@/lib/db";
import { UsersClient } from "./UsersClient";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [teams, staff, studentsWithoutTeam] = await Promise.all([
    prisma.team.findMany({
      include: {
        members: { include: { user: true } },
        lead: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "MANAGER"] } },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }),
    prisma.user.findMany({
      where: { role: "STUDENT", teamMembership: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <UsersClient
      teams={teams.map((t) => ({
        id: t.id,
        name: t.name,
        status: t.status,
        isFinalist: t.isFinalist,
        createdAt: t.createdAt.toISOString(),
        members: t.members.map((m) => ({
          userId: m.userId,
          role: m.role,
          name: m.user.name,
          email: m.user.email,
          isActive: m.user.isActive,
        })),
      }))}
      staff={staff.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt.toISOString(),
      }))}
      studentsWithoutTeam={studentsWithoutTeam.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
      }))}
    />
  );
}
