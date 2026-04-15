"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { sendEmail } from "@/lib/email/client";
import type { BroadcastRecipientScope } from "@prisma/client";

const schema = z.object({
  subject: z.string().min(2).max(200),
  body: z.string().min(1).max(20000),
  scope: z.enum(["ALL_REGISTERED", "ALL_COMPLETE", "FINALISTS"]),
  alsoArchive: z.string().optional(),
});

export type BroadcastState = { error?: string; notice?: string };

export async function sendBroadcastAction(
  _prev: BroadcastState,
  fd: FormData
): Promise<BroadcastState> {
  const user = await requireAdmin();
  const parsed = schema.safeParse({
    subject: fd.get("subject"),
    body: fd.get("body"),
    scope: fd.get("scope"),
    alsoArchive: fd.get("alsoArchive"),
  });
  if (!parsed.success) return { error: "Please complete all fields." };
  const { subject, body, scope, alsoArchive } = parsed.data;

  // Build recipient list
  let teamFilter;
  if (scope === "ALL_REGISTERED") teamFilter = {};
  else if (scope === "ALL_COMPLETE") teamFilter = { status: "COMPLETE" as const };
  else teamFilter = { isFinalist: true };

  const teams = await prisma.team.findMany({
    where: teamFilter,
    include: { members: { include: { user: true } } },
  });
  const recipients = teams.flatMap((t) => t.members.map((m) => m.user.email));
  if (recipients.length === 0) return { error: "No recipients in that scope." };

  // Create broadcast record first (for audit)
  const broadcast = await prisma.broadcastMessage.create({
    data: {
      subject,
      body,
      authorId: user.id,
      recipientScope: scope as BroadcastRecipientScope,
      sentAt: new Date(),
    },
  });

  // Fan out recipients
  let success = 0;
  let failure = 0;
  for (const team of teams) {
    try {
      const emails = team.members.map((m) => m.user.email);
      await sendEmail({
        to: emails,
        subject,
        html: `<div style="font-family: sans-serif; max-width: 600px;">${body.replace(/\n/g, "<br>")}</div>`,
        text: body,
      });
      await prisma.broadcastRecipient.create({
        data: { broadcastId: broadcast.id, teamId: team.id, deliveredAt: new Date() },
      });
      success += 1;
    } catch (e) {
      await prisma.broadcastRecipient.create({
        data: {
          broadcastId: broadcast.id,
          teamId: team.id,
          errorMessage: (e as Error).message,
        },
      });
      failure += 1;
    }
  }

  await prisma.broadcastMessage.update({
    where: { id: broadcast.id },
    data: { successCount: success, failureCount: failure },
  });

  // Archive as announcement if requested
  if (alsoArchive) {
    await prisma.announcement.create({
      data: {
        title: subject,
        body,
        authorId: user.id,
        fromBroadcastId: broadcast.id,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "broadcast.send",
      entityType: "broadcast",
      entityId: broadcast.id,
      details: { scope, recipientCount: success + failure, success, failure },
    },
  });

  revalidatePath("/admin/broadcast");
  revalidatePath("/admin/announcements");
  revalidatePath("/announcements");

  return {
    notice: `Broadcast sent to ${success} team${success === 1 ? "" : "s"}${
      failure > 0 ? `, ${failure} failed` : ""
    }.`,
  };
}
