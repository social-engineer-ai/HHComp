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

const CT_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/**
 * Format a Date (or ISO string) in America/Chicago with a clear CT suffix.
 * Safe to call on the server (where the system locale is usually UTC) —
 * output is identical to what the user would see in their browser.
 * Example: "Apr 22, 2026, 7:18 PM CT"
 */
export function formatDateCT(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return `${CT_FORMATTER.format(date)} CT`;
}
