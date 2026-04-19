"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { consumeCode, issueCode } from "@/lib/auth/codes";
import { createSession } from "@/lib/auth/session";
import { normalizeEmail } from "@/lib/validation/email";
import { sendEmail } from "@/lib/email/client";
import { emailTemplates } from "@/lib/email/templates";
import { rateLimit } from "@/lib/rate-limit";

const verifySchema = z.object({
  email: z.string().min(3),
  code: z.string().regex(/^\d{6}$/),
});

export type VerifyState = { error?: string; notice?: string };

export async function verifyEmailAction(
  _prev: VerifyState,
  formData: FormData
): Promise<VerifyState> {
  const parsed = verifySchema.safeParse({
    email: formData.get("email"),
    code: formData.get("code"),
  });
  if (!parsed.success) return { error: "Please enter a valid 6-digit code." };

  const emailLower = normalizeEmail(parsed.data.email);
  const rl = rateLimit(`verify:${emailLower}`, 10, 5 * 60 * 1000);
  if (!rl.ok) return { error: "Too many attempts. Please wait a few minutes." };

  const user = await prisma.user.findUnique({ where: { emailLower } });
  if (!user) return { error: "Account not found." };
  if (user.emailVerifiedAt) {
    redirect("/login");
  }

  const result = await consumeCode(user.id, "EMAIL_VERIFY", parsed.data.code);
  if (!result.ok) return { error: result.reason };

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date() },
  });

  const hdrs = await headers();
  await createSession(user.id, {
    ip: hdrs.get("x-forwarded-for") ?? hdrs.get("x-real-ip"),
    userAgent: hdrs.get("user-agent"),
  });

  // Send welcome email based on whether they're a lead or a member
  const appUrl = process.env.PUBLIC_APP_URL ?? process.env.APP_URL ?? "";
  const loginUrl = `${appUrl}/login`;
  const membership = await prisma.teamMembership.findUnique({
    where: { userId: user.id },
    include: { team: true },
  });
  if (membership) {
    if (membership.role === "LEAD") {
      await sendEmail({
        to: user.email,
        ...emailTemplates.welcomeTeamLead({ name: user.name, loginUrl }),
      });
    } else {
      await sendEmail({
        to: user.email,
        ...emailTemplates.welcomeTeamMember({
          name: user.name,
          teamName: membership.team.name,
          loginUrl,
        }),
      });
    }
  }

  redirect("/dashboard");
}

export type ResendState = { error?: string; notice?: string };

export async function resendVerificationAction(
  _prev: ResendState,
  formData: FormData
): Promise<ResendState> {
  const email = String(formData.get("email") ?? "");
  const emailLower = normalizeEmail(email);
  const rl = rateLimit(`resend:${emailLower}`, 3, 10 * 60 * 1000);
  if (!rl.ok) return { error: "Please wait before requesting another code." };

  const user = await prisma.user.findUnique({ where: { emailLower } });
  if (!user) return { error: "Account not found." };
  if (user.emailVerifiedAt) return { notice: "Email already verified. Please log in." };

  const code = await issueCode(user.id, "EMAIL_VERIFY");
  const tpl = emailTemplates.verificationCode({ code, name: user.name });
  await sendEmail({ to: user.email, ...tpl });
  return { notice: "A new verification code has been sent to your email." };
}
