"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { sendEmail } from "@/lib/email/client";
import { emailTemplates } from "@/lib/email/templates";

export async function toggleFinalistAction(teamId: string) {
  const user = await requireAdmin();
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { members: { include: { user: true } } },
  });
  if (!team) return;

  const newFinalist = !team.isFinalist;
  await prisma.team.update({
    where: { id: teamId },
    data: {
      isFinalist: newFinalist,
      finalistNotifiedAt: newFinalist ? new Date() : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: newFinalist ? "team.mark_finalist" : "team.unmark_finalist",
      entityType: "team",
      entityId: teamId,
      details: { teamName: team.name },
    },
  });

  if (newFinalist) {
    try {
      await sendEmail({
        to: team.members.map((m) => m.user.email),
        ...emailTemplates.finalistSelected({
          teamName: team.name,
          presentationInfo:
            "<p>Final presentations: Thursday May 7. Details will be emailed separately.</p>",
        }),
      });
    } catch (e) {
      console.warn("Failed to send finalist email:", (e as Error).message);
    }
  }

  revalidatePath("/admin/submissions");
  revalidatePath("/admin/users");
  revalidatePath("/leaderboard");
}
