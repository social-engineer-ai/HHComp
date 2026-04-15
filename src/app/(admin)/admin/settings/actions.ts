"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";

export type SettingsState = { error?: string; notice?: string };

export async function updateSettingsAction(
  _prev: SettingsState,
  fd: FormData
): Promise<SettingsState> {
  const user = await requireAdmin();

  const deadline = new Date(String(fd.get("submissionDeadline") ?? ""));
  const grace = new Date(String(fd.get("gracePeriodEnd") ?? ""));
  const regClose = new Date(String(fd.get("registrationClose") ?? ""));

  if (
    Number.isNaN(deadline.getTime()) ||
    Number.isNaN(grace.getTime()) ||
    Number.isNaN(regClose.getTime())
  ) {
    return { error: "Invalid dates." };
  }
  if (grace < deadline) return { error: "Grace period must be after primary deadline." };

  await prisma.competitionSettings.upsert({
    where: { id: 1 },
    update: {
      submissionDeadline: deadline,
      gracePeriodEnd: grace,
      registrationClose: regClose,
    },
    create: {
      id: 1,
      submissionDeadline: deadline,
      gracePeriodEnd: grace,
      registrationClose: regClose,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "settings.update",
      entityType: "settings",
      details: {
        submissionDeadline: deadline.toISOString(),
        gracePeriodEnd: grace.toISOString(),
        registrationClose: regClose.toISOString(),
      },
    },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/dashboard");
  return { notice: "Settings updated." };
}
