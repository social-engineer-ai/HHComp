"use server";

import { revalidatePath } from "next/cache";
import { requireUser, getTeamForUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { generateInvitationCode, invitationExpiryFromNow } from "@/lib/invitations";
import { isIllinoisEmail, normalizeEmail } from "@/lib/validation/email";
import { sendEmail } from "@/lib/email/client";
import { emailTemplates } from "@/lib/email/templates";
import { rateLimit } from "@/lib/rate-limit";

export type InviteState = { error?: string; notice?: string };

export async function sendInvitationAction(
  _prev: InviteState,
  formData: FormData
): Promise<InviteState> {
  const user = await requireUser();
  const team = await getTeamForUser(user.id);
  if (!team) return { error: "You don't have a team yet." };
  if (team.leadUserId !== user.id)
    return { error: "Only the team lead can send invitations." };
  if (team.members.length >= 2) return { error: "Team is already full." };

  const rawEmail = String(formData.get("inviteeEmail") ?? "");
  if (!isIllinoisEmail(rawEmail))
    return { error: "Please enter a valid @illinois.edu email." };

  const emailLower = normalizeEmail(rawEmail);

  if (team.members.some((m) => m.user.emailLower === emailLower))
    return { error: "That person is already on your team." };

  const rl = rateLimit(`invite:${team.id}`, 5, 15 * 60 * 1000);
  if (!rl.ok) return { error: "Too many invitations. Please wait a few minutes." };

  // Block if the target email already belongs to another team
  const existing = await prisma.user.findUnique({
    where: { emailLower },
    include: { teamMembership: true },
  });
  if (existing?.teamMembership)
    return { error: "That student is already on another team." };

  // Revoke any prior pending invitations for this team
  await prisma.invitation.updateMany({
    where: { teamId: team.id, status: "PENDING" },
    data: { status: "REVOKED" },
  });

  const code = generateInvitationCode();
  await prisma.invitation.create({
    data: {
      teamId: team.id,
      inviteeEmail: emailLower,
      code,
      expiresAt: invitationExpiryFromNow(),
      status: "PENDING",
    },
  });

  const appUrl = process.env.PUBLIC_APP_URL ?? process.env.APP_URL ?? "";
  const joinUrl = `${appUrl}/join?code=${code}`;
  await sendEmail({
    to: emailLower,
    ...emailTemplates.teamInvitation({
      teamName: team.name,
      leadName: user.name,
      code,
      joinUrl,
    }),
  });

  revalidatePath("/dashboard");
  return { notice: `Invitation sent to ${emailLower}.` };
}

export async function regenerateInvitationAction(): Promise<InviteState> {
  const user = await requireUser();
  const team = await getTeamForUser(user.id);
  if (!team) return { error: "No team." };
  if (team.leadUserId !== user.id) return { error: "Only the lead can do this." };

  const pending = await prisma.invitation.findFirst({
    where: { teamId: team.id, status: "PENDING" },
  });
  if (!pending) return { error: "No pending invitation to regenerate." };

  const code = generateInvitationCode();
  await prisma.invitation.update({
    where: { id: pending.id },
    data: { code, expiresAt: invitationExpiryFromNow() },
  });

  revalidatePath("/dashboard");
  return { notice: "Invitation code regenerated." };
}
