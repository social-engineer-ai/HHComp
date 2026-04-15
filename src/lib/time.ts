import { prisma } from "@/lib/db";

export type DeadlineInfo = {
  primaryDeadline: Date;
  graceEnd: Date;
  now: Date;
  state: "open" | "grace" | "closed";
  msUntilDeadline: number;
  msUntilGraceEnd: number;
};

export async function getDeadlineInfo(): Promise<DeadlineInfo> {
  const settings = await prisma.competitionSettings.findUnique({ where: { id: 1 } });
  const now = new Date();
  const primaryDeadline = settings?.submissionDeadline ?? new Date(process.env.COMPETITION_DEADLINE_ISO ?? Date.now());
  const graceEnd = settings?.gracePeriodEnd ?? new Date(process.env.COMPETITION_GRACE_END_ISO ?? Date.now());

  let state: "open" | "grace" | "closed";
  if (now < primaryDeadline) state = "open";
  else if (now < graceEnd) state = "grace";
  else state = "closed";

  return {
    primaryDeadline,
    graceEnd,
    now,
    state,
    msUntilDeadline: primaryDeadline.getTime() - now.getTime(),
    msUntilGraceEnd: graceEnd.getTime() - now.getTime(),
  };
}

export function isLate(uploadedAt: Date, primaryDeadline: Date): boolean {
  return uploadedAt.getTime() > primaryDeadline.getTime();
}
