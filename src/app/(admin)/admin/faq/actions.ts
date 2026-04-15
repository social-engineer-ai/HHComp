"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";

const schema = z.object({
  question: z.string().min(2).max(500),
  answer: z.string().min(1).max(10000),
});

export type FAQState = { error?: string; notice?: string };

export async function createFAQAction(
  _prev: FAQState,
  fd: FormData
): Promise<FAQState> {
  await requireAdmin();
  const parsed = schema.safeParse({
    question: fd.get("question"),
    answer: fd.get("answer"),
  });
  if (!parsed.success) return { error: "Question and answer required." };
  const max = await prisma.fAQItem.aggregate({
    _max: { displayOrder: true },
  });
  await prisma.fAQItem.create({
    data: {
      question: parsed.data.question,
      answer: parsed.data.answer,
      displayOrder: (max._max.displayOrder ?? 0) + 1,
    },
  });
  revalidatePath("/admin/faq");
  revalidatePath("/faq");
  return { notice: "FAQ item added." };
}

export async function deleteFAQAction(id: string) {
  await requireAdmin();
  await prisma.fAQItem.delete({ where: { id } });
  revalidatePath("/admin/faq");
  revalidatePath("/faq");
}
