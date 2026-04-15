import { createHash, randomInt } from "node:crypto";
import { prisma } from "@/lib/db";
import type { VerificationCodePurpose } from "@prisma/client";

const CODE_TTL_MIN = 15;
const MAX_ATTEMPTS = 5;

export function generateCode(): string {
  // 6-digit, zero-padded, cryptographically random
  const n = randomInt(0, 1_000_000);
  return n.toString().padStart(6, "0");
}

export function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export async function issueCode(
  userId: string,
  purpose: VerificationCodePurpose
): Promise<string> {
  const code = generateCode();
  const codeHash = hashCode(code);
  // Invalidate prior outstanding codes of this purpose
  await prisma.verificationCode.updateMany({
    where: { userId, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  await prisma.verificationCode.create({
    data: {
      userId,
      purpose,
      codeHash,
      expiresAt: new Date(Date.now() + CODE_TTL_MIN * 60 * 1000),
    },
  });
  return code;
}

export async function consumeCode(
  userId: string,
  purpose: VerificationCodePurpose,
  code: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const codeHash = hashCode(code);
  const record = await prisma.verificationCode.findFirst({
    where: { userId, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return { ok: false, reason: "No active code. Request a new one." };
  if (record.expiresAt < new Date())
    return { ok: false, reason: "Code expired. Request a new one." };
  if (record.attempts >= MAX_ATTEMPTS)
    return { ok: false, reason: "Too many attempts. Request a new code." };

  if (record.codeHash !== codeHash) {
    await prisma.verificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, reason: "Incorrect code." };
  }
  await prisma.verificationCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });
  return { ok: true };
}
