"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import { issueCode } from "@/lib/auth/codes";
import { isIllinoisEmail, normalizeEmail } from "@/lib/validation/email";
import { normalizeTeamName, validateTeamName } from "@/lib/validation/team-name";
import { sendEmail } from "@/lib/email/client";
import { emailTemplates } from "@/lib/email/templates";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().min(3).max(200),
  password: z.string().min(8).max(200),
  teamName: z.string().min(2).max(64),
  eligibility: z.string().optional(),
});

export type RegisterState = { error?: string; ok?: boolean };

export async function registerAction(
  _prev: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    teamName: formData.get("teamName"),
    eligibility: formData.get("eligibility"),
  });
  if (!parsed.success) {
    return { error: "Please fill in all fields correctly." };
  }
  const { name, email, password, teamName, eligibility } = parsed.data;

  if (!eligibility) {
    return { error: "You must confirm Gies College of Business enrollment." };
  }
  if (!isIllinoisEmail(email)) {
    return { error: "Please use your @illinois.edu email address." };
  }
  const pwErr = validatePasswordStrength(password);
  if (pwErr) return { error: pwErr };
  const tnErr = validateTeamName(teamName);
  if (tnErr) return { error: tnErr };

  const emailLower = normalizeEmail(email);
  const rl = rateLimit(`register:${emailLower}`, 5, 60 * 60 * 1000);
  if (!rl.ok) return { error: "Too many attempts. Please try again later." };

  const existingUser = await prisma.user.findUnique({ where: { emailLower } });
  if (existingUser) {
    return { error: "An account with that email already exists. Please log in." };
  }
  const nameLower = normalizeTeamName(teamName);
  const existingTeam = await prisma.team.findUnique({ where: { nameLower } });
  if (existingTeam) {
    return { error: "That team name is already taken. Please choose another." };
  }

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
    const t = await tx.team.create({
      data: {
        name: teamName.trim(),
        nameLower,
        leadUserId: u.id,
        status: "INCOMPLETE",
      },
    });
    await tx.teamMembership.create({
      data: { teamId: t.id, userId: u.id, role: "LEAD" },
    });
    return u;
  });

  const code = await issueCode(user.id, "EMAIL_VERIFY");
  const tpl = emailTemplates.verificationCode({ code, name: user.name });
  await sendEmail({ to: user.email, ...tpl });

  redirect(`/verify-email?email=${encodeURIComponent(user.email)}`);
}
