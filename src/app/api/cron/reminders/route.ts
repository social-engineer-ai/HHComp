import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/client";
import { emailTemplates } from "@/lib/email/templates";
import type { ReminderType } from "@prisma/client";

export const dynamic = "force-dynamic";

const REMINDERS: { type: ReminderType; hoursBefore: number }[] = [
  { type: "H48", hoursBefore: 48 },
  { type: "H6", hoursBefore: 6 },
  { type: "H1", hoursBefore: 1 },
];

export async function POST(req: NextRequest) {
  const auth = req.headers.get("x-cron-secret");
  const expected = process.env.GRADER_SHARED_SECRET ?? "";
  if (!expected || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.competitionSettings.findUnique({ where: { id: 1 } });
  if (!settings) return NextResponse.json({ error: "No settings" }, { status: 500 });

  const deadline = settings.submissionDeadline;
  const now = new Date();
  const sent: Array<{ team: string; type: ReminderType }> = [];

  for (const { type, hoursBefore } of REMINDERS) {
    const windowStart = new Date(deadline.getTime() - hoursBefore * 60 * 60 * 1000);
    if (now < windowStart) continue;
    if (now >= deadline) continue;

    // Find complete teams that do NOT have all 4 latest submissions
    const teams = await prisma.team.findMany({
      where: { status: "COMPLETE" },
      include: {
        members: { include: { user: true } },
        submissions: { where: { isLatest: true } },
      },
    });

    for (const team of teams) {
      if (team.submissions.length >= 4) continue;

      const already = await prisma.reminderSent.findUnique({
        where: { teamId_reminderType: { teamId: team.id, reminderType: type } },
      });
      if (already) continue;

      const recipients = team.members.map((m) => m.user.email);
      try {
        await sendEmail({
          to: recipients,
          ...emailTemplates.deadlineReminder({
            teamName: team.name,
            hoursLeft: hoursBefore,
          }),
        });
        await prisma.reminderSent.create({
          data: { teamId: team.id, reminderType: type },
        });
        sent.push({ team: team.name, type });
      } catch (e) {
        console.warn("Failed to send reminder:", (e as Error).message);
      }
    }
  }

  return NextResponse.json({ sent });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
