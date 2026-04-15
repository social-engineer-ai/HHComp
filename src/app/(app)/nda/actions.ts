"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, getTeamForUser } from "@/lib/auth/guards";
import { namesMatch } from "@/lib/validation/name-match";
import { sendEmail } from "@/lib/email/client";
import { emailTemplates } from "@/lib/email/templates";

const schema = z.object({
  typedName: z.string().min(2).max(200),
  agree: z.string().optional(),
});

export type SignState = { error?: string; notice?: string };

export async function signNDAAction(
  _prev: SignState,
  fd: FormData
): Promise<SignState> {
  const user = await requireUser();
  const parsed = schema.safeParse({
    typedName: fd.get("typedName"),
    agree: fd.get("agree"),
  });
  if (!parsed.success) return { error: "Please type your full legal name." };
  if (!parsed.data.agree) return { error: "You must agree to the NDA terms." };

  if (!namesMatch(parsed.data.typedName, user.name)) {
    return {
      error: `The name you entered does not match your registered name (${user.name}). Please type it exactly.`,
    };
  }

  const active = await prisma.dataFile.findFirst({
    where: { fileType: "NDA", isActive: true },
  });
  if (!active) return { error: "No NDA is currently available to sign." };

  const already = await prisma.nDASignature.findFirst({
    where: { userId: user.id, ndaDocumentHash: active.sha256 },
  });
  if (already) {
    redirect("/dashboard");
  }

  const hdrs = await headers();
  const ipAddress =
    hdrs.get("x-forwarded-for")?.split(",")[0].trim() ??
    hdrs.get("x-real-ip") ??
    "unknown";

  await prisma.nDASignature.create({
    data: {
      userId: user.id,
      ndaDataFileId: active.id,
      ndaDocumentHash: active.sha256,
      typedName: parsed.data.typedName.trim(),
      ipAddress,
      userAgent: hdrs.get("user-agent") ?? undefined,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "nda.sign",
      entityType: "nda",
      entityId: active.id,
      ipAddress,
      details: { typedName: parsed.data.typedName.trim() },
    },
  });

  // If both team members have now signed, email them
  const team = await getTeamForUser(user.id);
  if (team && team.members.length === 2) {
    const memberIds = team.members.map((m) => m.userId);
    const signed = await prisma.nDASignature.count({
      where: { userId: { in: memberIds }, ndaDocumentHash: active.sha256 },
    });
    if (signed === 2) {
      const recipients = team.members.map((m) => m.user.email);
      await sendEmail({
        to: recipients,
        ...emailTemplates.ndaConfirmed({ teamName: team.name }),
      });
    }
  }

  redirect("/dashboard");
}
