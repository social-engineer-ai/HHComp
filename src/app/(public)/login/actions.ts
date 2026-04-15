"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { normalizeEmail } from "@/lib/validation/email";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().min(3),
  password: z.string().min(1),
});

export type LoginState = { error?: string };

const LOCKOUT_AFTER = 5;
const LOCKOUT_MIN = 5;

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Please enter your email and password." };

  const emailLower = normalizeEmail(parsed.data.email);
  const rl = rateLimit(`login:${emailLower}`, 10, 60 * 1000);
  if (!rl.ok) return { error: "Too many attempts. Please wait a minute." };

  const user = await prisma.user.findUnique({ where: { emailLower } });
  if (!user || !user.isActive) return { error: "Invalid email or password." };

  if (user.lockoutUntil && user.lockoutUntil > new Date()) {
    return { error: "Account temporarily locked. Please try again in a few minutes." };
  }

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    const fails = user.failedLoginCount + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: fails,
        lockoutUntil:
          fails >= LOCKOUT_AFTER
            ? new Date(Date.now() + LOCKOUT_MIN * 60 * 1000)
            : user.lockoutUntil,
      },
    });
    return { error: "Invalid email or password." };
  }

  if (!user.emailVerifiedAt) {
    redirect(`/verify-email?email=${encodeURIComponent(user.email)}`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockoutUntil: null, lastLoginAt: new Date() },
  });

  const hdrs = await headers();
  await createSession(user.id, {
    ip: hdrs.get("x-forwarded-for") ?? hdrs.get("x-real-ip"),
    userAgent: hdrs.get("user-agent"),
  });

  redirect(user.role === "STUDENT" ? "/dashboard" : "/admin");
}
