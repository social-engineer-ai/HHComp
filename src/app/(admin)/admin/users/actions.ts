"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStrictAdmin } from "@/lib/auth/guards";
import { hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import { normalizeEmail } from "@/lib/validation/email";

export type UserActionState = { error?: string; notice?: string };

const createSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
  role: z.enum(["MANAGER", "ADMIN"]),
});

export async function createStaffAccountAction(
  _prev: UserActionState,
  fd: FormData
): Promise<UserActionState> {
  const actor = await requireStrictAdmin();
  const parsed = createSchema.safeParse({
    name: fd.get("name"),
    email: fd.get("email"),
    password: fd.get("password"),
    role: fd.get("role"),
  });
  if (!parsed.success) return { error: "Please fill in all fields with a valid email." };

  const pwErr = validatePasswordStrength(parsed.data.password);
  if (pwErr) return { error: pwErr };

  const emailLower = normalizeEmail(parsed.data.email);
  const existing = await prisma.user.findUnique({ where: { emailLower } });
  if (existing) {
    return { error: "A user with that email already exists. Promote them instead." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const created = await prisma.user.create({
    data: {
      name: parsed.data.name.trim(),
      email: emailLower,
      emailLower,
      passwordHash,
      role: parsed.data.role,
      emailVerifiedAt: new Date(),
      isActive: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: "user.create_staff",
      entityType: "user",
      entityId: created.id,
      details: { email: emailLower, role: parsed.data.role },
    },
  });

  revalidatePath("/admin/users");
  return {
    notice: `Created ${parsed.data.role.toLowerCase()} account for ${emailLower}.`,
  };
}

export async function promoteToManagerAction(userId: string) {
  const actor = await requireStrictAdmin();
  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: { teamMembership: { include: { team: true } }, ledTeam: true },
  });
  if (!target) return;
  if (target.role === "ADMIN") return; // can't touch admins via this path

  await prisma.$transaction(async (tx) => {
    // If this user leads a team, deleting the team would nuke teammates' work.
    // Block promotion of team leads unless the team has no teammate yet.
    // For now, unlink the user from any team they're a member of.
    if (target.ledTeam) {
      // Team lead — delete the team entirely (cascades to memberships/submissions).
      // Safer: require admin to manually handle this case. Skip instead.
      return;
    }
    if (target.teamMembership) {
      await tx.teamMembership.delete({ where: { id: target.teamMembership.id } });
      // Mark team incomplete again
      await tx.team.update({
        where: { id: target.teamMembership.teamId },
        data: { status: "INCOMPLETE" },
      });
    }
    await tx.user.update({
      where: { id: userId },
      data: { role: "MANAGER" },
    });
  });

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: "user.promote_manager",
      entityType: "user",
      entityId: userId,
    },
  });

  revalidatePath("/admin/users");
}

export async function demoteToStudentAction(userId: string) {
  const actor = await requireStrictAdmin();
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.role !== "MANAGER") return;

  await prisma.user.update({
    where: { id: userId },
    data: { role: "STUDENT" },
  });
  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: "user.demote_to_student",
      entityType: "user",
      entityId: userId,
    },
  });
  revalidatePath("/admin/users");
}

export async function deactivateUserAction(userId: string) {
  const actor = await requireStrictAdmin();
  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: { sessions: true },
  });
  if (!target || target.role === "ADMIN") return;
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { isActive: !target.isActive },
    });
    // If deactivating, revoke all active sessions so they can't keep using the site
    if (target.isActive) {
      await tx.session.deleteMany({ where: { userId } });
    }
  });
  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: target.isActive ? "user.deactivate" : "user.activate",
      entityType: "user",
      entityId: userId,
      details: { email: target.email, role: target.role },
    },
  });
  revalidatePath("/admin/users");
}
