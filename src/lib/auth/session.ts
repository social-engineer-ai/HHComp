import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import type { User } from "@prisma/client";

const COOKIE_NAME = "hh_session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function randomId(): string {
  return randomBytes(32).toString("hex");
}

export async function createSession(
  userId: string,
  req?: { ip?: string | null; userAgent?: string | null }
): Promise<string> {
  const id = randomId();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({
    data: {
      id,
      userId,
      expiresAt,
      ipAddress: req?.ip ?? null,
      userAgent: req?.userAgent ?? null,
    },
  });
  const store = await cookies();
  store.set(COOKIE_NAME, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return id;
}

export async function destroyCurrentSession(): Promise<void> {
  const store = await cookies();
  const id = store.get(COOKIE_NAME)?.value;
  if (id) {
    await prisma.session.deleteMany({ where: { id } }).catch(() => {});
  }
  store.delete(COOKIE_NAME);
}

export type SessionUser = Omit<User, "passwordHash">;

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const id = store.get(COOKIE_NAME)?.value;
  if (!id) return null;
  const session = await prisma.session.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id } }).catch(() => {});
    return null;
  }
  if (!session.user.isActive) return null;
  // Strip password hash
  const { passwordHash: _ph, ...safe } = session.user;
  return safe;
}

export async function purgeExpiredSessions(): Promise<number> {
  const { count } = await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return count;
}
