"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";

const schema = z.object({
  title: z.string().min(2).max(200),
  body: z.string().min(1).max(20000),
});

export type AnnouncementState = { error?: string; notice?: string };

export async function createAnnouncementAction(
  _prev: AnnouncementState,
  fd: FormData
): Promise<AnnouncementState> {
  const user = await requireAdmin();
  const parsed = schema.safeParse({ title: fd.get("title"), body: fd.get("body") });
  if (!parsed.success) return { error: "Title and body required." };
  await prisma.announcement.create({
    data: { title: parsed.data.title, body: parsed.data.body, authorId: user.id },
  });
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "announcement.create",
      entityType: "announcement",
      details: { title: parsed.data.title },
    },
  });
  revalidatePath("/admin/announcements");
  revalidatePath("/announcements");
  return { notice: "Announcement posted." };
}

export async function deleteAnnouncementAction(id: string) {
  const user = await requireAdmin();
  await prisma.announcement.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "announcement.delete",
      entityType: "announcement",
      entityId: id,
    },
  });
  revalidatePath("/admin/announcements");
  revalidatePath("/announcements");
}
