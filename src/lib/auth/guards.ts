import { redirect } from "next/navigation";
import { getCurrentUser, type SessionUser } from "./session";
import { prisma } from "@/lib/db";

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.role !== "MANAGER") redirect("/dashboard");
  return user;
}

export async function requireStrictAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

export async function requireStudent(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "STUDENT") redirect("/admin");
  return user;
}

export async function getTeamForUser(userId: string) {
  const m = await prisma.teamMembership.findUnique({
    where: { userId },
    include: {
      team: {
        include: {
          members: { include: { user: true } },
        },
      },
    },
  });
  return m?.team ?? null;
}
