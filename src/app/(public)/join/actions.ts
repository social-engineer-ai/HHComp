"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import { issueCode } from "@/lib/auth/codes";
import { isIllinoisEmail, normalizeEmail } from "@/lib/validation/email";
import { sendEmail } from "@/lib/email/client";
import { emailTemplates } from "@/lib/email/templates";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().min(3),
  password: z.string().min(8),
  code: z.string().min(4).max(16),
  eligibility: z.string().optional(),
});

export type JoinState = { error?: string };

export async function joinAction(
  _prev: JoinState,
  formData: FormData
): Promise<JoinState> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    code: formData.get("code"),
    eligibility: formData.get("eligibility"),
  });
  if (!parsed.success) return { error: "Please fill in all fields correctly." };
  const { name, email, password, code, eligibility } = parsed.data;

  if (!eligibility) return { error: "You must confirm Gies enrollment." };
  if (!isIllinoisEmail(email)) return { error: "Please use your @illinois.edu email." };
  const pwErr = validatePasswordStrength(password);
  if (pwErr) return { error: pwErr };

  const emailLower = normalizeEmail(email);
  const rl = rateLimit(`join:${emailLower}`, 5, 60 * 60 * 1000);
  if (!rl.ok) return { error: "Too many attempts. Try again later." };

  const normalizedCode = code.trim().toUpperCase();

  const invitation = await prisma.invitation.findUnique({
    where: { code: normalizedCode },
    include: { team: { include: { members: true, lead: true } } },
  });
  if (!invitation) return { error: "Invalid invitation code." };
  if (invitation.status !== "PENDING")
    return { error: "This invitation is no longer active." };
  if (invitation.expiresAt < new Date())
    return { error: "This invitation has expired. Ask your team lead for a new one." };
  if (normalizeEmail(invitation.inviteeEmail) !== emailLower)
    return {
      error: "Your email doesn't match the invitation. Please ask your team lead to update it.",
    };
  if (invitation.team.members.length >= 2)
    return { error: "This team is already full." };

  const existingUser = await prisma.user.findUnique({ where: { emailLower } });
  if (existingUser) return { error: "An account with that email already exists." };

  const passwordHash = await hashPassword(password);

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        name: name.trim(),
        email: emailLower,
        emailLower,
        passwordHash,
        role: "STUDENT",
      },
    });
    await tx.teamMembership.create({
      data: { teamId: invitation.teamId, userId: u.id, role: "MEMBER" },
    });
    await tx.invitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
    await tx.team.update({
      where: { id: invitation.teamId },
      data: { status: "COMPLETE" },
    });
    return u;
  });

  // Email: verification code for the joiner
  const verifyCode = await issueCode(user.id, "EMAIL_VERIFY");
  await sendEmail({
    to: user.email,
    ...emailTemplates.verificationCode({ code: verifyCode, name: user.name }),
  });

  // Email: team-complete confirmation to both members
  const appUrl = process.env.PUBLIC_APP_URL ?? process.env.APP_URL ?? "";
  const team = await prisma.team.findUnique({
    where: { id: invitation.teamId },
    include: { members: { include: { user: true } } },
  });
  if (team) {
    const recipients = team.members.map((m) => m.user.email);
    await sendEmail({
      to: recipients,
      ...emailTemplates.teamComplete({
        teamName: team.name,
        loginUrl: `${appUrl}/login`,
      }),
    });
  }

  redirect(`/verify-email?email=${encodeURIComponent(user.email)}`);
}
