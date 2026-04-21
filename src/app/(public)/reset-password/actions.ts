"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { consumeCode } from "@/lib/auth/codes";
import { hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { normalizeEmail } from "@/lib/validation/email";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().min(3).max(200),
  code: z.string().regex(/^\d{6}$/),
  password: z.string().min(8).max(200),
  confirm: z.string().min(8).max(200),
});

export type ResetState = { error?: string };

export async function resetPasswordAction(
  _prev: ResetState,
  formData: FormData
): Promise<ResetState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    code: formData.get("code"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: "Please fill in your email, code, and a new password (min 8 characters)." };
  }

  if (parsed.data.password !== parsed.data.confirm) {
    return { error: "The two passwords don't match." };
  }

  const strengthError = validatePasswordStrength(parsed.data.password);
  if (strengthError) return { error: strengthError };

  const emailLower = normalizeEmail(parsed.data.email);

  // Rate limit code attempts per email.
  const rl = rateLimit(`reset:${emailLower}`, 10, 5 * 60 * 1000);
  if (!rl.ok) {
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const user = await prisma.user.findUnique({ where: { emailLower } });
  // Always return the same message whether the user doesn't exist, is inactive,
  // or the code is wrong. Prevents account enumeration.
  const genericBadCode = "Incorrect or expired code. Please request a new one.";
  if (!user || !user.isActive) return { error: genericBadCode };

  const result = await consumeCode(user.id, "PASSWORD_RESET", parsed.data.code);
  if (!result.ok) return { error: result.reason };

  const newHash = await hashPassword(parsed.data.password);
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for") ?? hdrs.get("x-real-ip");
  const userAgent = hdrs.get("user-agent");

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        failedLoginCount: 0,
        lockoutUntil: null,
        emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
      },
    }),
    // Invalidate all existing sessions — forces other devices to re-auth.
    prisma.session.deleteMany({ where: { userId: user.id } }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "password.reset",
        entityType: "user",
        entityId: user.id,
        ipAddress: ip ?? null,
      },
    }),
  ]);

  await createSession(user.id, { ip, userAgent });

  redirect(user.role === "STUDENT" ? "/dashboard" : "/admin");
}
