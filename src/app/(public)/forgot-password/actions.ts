"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { issueCode } from "@/lib/auth/codes";
import { normalizeEmail } from "@/lib/validation/email";
import { sendEmail } from "@/lib/email/client";
import { emailTemplates } from "@/lib/email/templates";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().min(3).max(200),
});

export type ForgotState = { error?: string };

export async function forgotPasswordAction(
  _prev: ForgotState,
  formData: FormData
): Promise<ForgotState> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "Please enter your email." };

  const emailLower = normalizeEmail(parsed.data.email);

  // Per-email rate limit: 3 requests per 10 minutes. Matches resend-verification.
  const rl = rateLimit(`forgot:${emailLower}`, 3, 10 * 60 * 1000);

  // Silently issue a code if the user exists and is active. Whether or not the
  // email matched, we always redirect to the reset page with a generic notice,
  // so response timing and UI do not leak account existence.
  if (rl.ok) {
    const user = await prisma.user.findUnique({ where: { emailLower } });
    if (user && user.isActive) {
      const code = await issueCode(user.id, "PASSWORD_RESET");
      const appUrl = process.env.PUBLIC_APP_URL ?? process.env.APP_URL ?? "";
      const resetUrl = `${appUrl}/reset-password?email=${encodeURIComponent(user.email)}`;
      await sendEmail({
        to: user.email,
        ...emailTemplates.passwordResetCode({ code, name: user.name, resetUrl }),
      });
    }
  }

  redirect(`/reset-password?email=${encodeURIComponent(emailLower)}&sent=1`);
}
