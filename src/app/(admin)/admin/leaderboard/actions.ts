"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import type { LeaderboardVisibility } from "@prisma/client";

export type LBState = { error?: string; notice?: string };

export async function setLeaderboardVisibilityAction(
  visibility: LeaderboardVisibility
) {
  const user = await requireAdmin();
  await prisma.competitionSettings.upsert({
    where: { id: 1 },
    update: { leaderboardVisibility: visibility },
    create: {
      id: 1,
      leaderboardVisibility: visibility,
      submissionDeadline: new Date(process.env.COMPETITION_DEADLINE_ISO ?? Date.now()),
      gracePeriodEnd: new Date(process.env.COMPETITION_GRACE_END_ISO ?? Date.now()),
      registrationClose: new Date(process.env.COMPETITION_DEADLINE_ISO ?? Date.now()),
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "leaderboard.visibility",
      entityType: "settings",
      details: { visibility },
    },
  });
  revalidatePath("/admin/leaderboard");
  revalidatePath("/leaderboard");
}

export async function rescoreAllAction(): Promise<void> {
  const user = await requireAdmin();
  const latestPredictions = await prisma.submission.findMany({
    where: { componentType: "PREDICTION", isLatest: true },
    select: { id: true },
  });
  for (const s of latestPredictions) {
    await prisma.gradingJob.create({
      data: { submissionId: s.id, status: "QUEUED" },
    });
  }
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "leaderboard.rescore_all",
      details: { count: latestPredictions.length },
    },
  });
  revalidatePath("/admin/leaderboard");
}

export async function overrideScoreAction(
  _prev: LBState,
  fd: FormData
): Promise<LBState> {
  const user = await requireAdmin();
  const teamId = String(fd.get("teamId") ?? "");
  const valueRaw = String(fd.get("value") ?? "");
  const reason = String(fd.get("reason") ?? "");
  const value = parseFloat(valueRaw);
  if (Number.isNaN(value)) return { error: "Invalid score value." };
  if (!reason.trim()) return { error: "Reason is required." };

  const existing = await prisma.score.findUnique({ where: { teamId } });
  if (!existing) return { error: "No existing score for this team." };

  await prisma.score.update({
    where: { teamId },
    data: {
      scoreValue: value,
      isManualOverride: true,
      overrideReason: reason,
      overriddenById: user.id,
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "score.override",
      entityType: "score",
      entityId: existing.id,
      details: { teamId, value, reason },
    },
  });
  revalidatePath("/admin/leaderboard");
  revalidatePath("/leaderboard");
  return { notice: "Score override recorded." };
}
