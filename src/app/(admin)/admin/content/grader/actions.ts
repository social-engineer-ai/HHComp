"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { uploadFormFile, validateFile } from "@/lib/storage/upload-helpers";

export type GraderUploadState = { error?: string; notice?: string };

export async function uploadAnswerKeyAction(
  _prev: GraderUploadState,
  fd: FormData
): Promise<GraderUploadState> {
  const user = await requireAdmin();
  const file = fd.get("file") as File | null;
  if (!file || !(file instanceof File)) return { error: "Please select a file." };

  const err = validateFile(file, {
    maxSizeBytes: 20 * 1024 * 1024,
    allowedExtensions: ["xlsx", "xls", "csv"],
  });
  if (err) return { error: err };

  const put = await uploadFormFile(file, "private/answer-key");

  const created = await prisma.$transaction(async (tx) => {
    await tx.dataFile.updateMany({
      where: { fileType: "ANSWER_KEY", isActive: true },
      data: { isActive: false },
    });
    const c = await tx.dataFile.create({
      data: {
        filename: put.originalFilename,
        description: "Answer key (confidential)",
        s3Key: put.key,
        fileSize: put.fileSize,
        sha256: put.sha256,
        mimeType: put.mimeType,
        fileType: "ANSWER_KEY",
        uploadedById: user.id,
        isActive: true,
      },
    });
    await tx.competitionSettings.upsert({
      where: { id: 1 },
      update: { activeAnswerKeyId: c.id },
      create: {
        id: 1,
        activeAnswerKeyId: c.id,
        submissionDeadline: new Date(process.env.COMPETITION_DEADLINE_ISO ?? Date.now()),
        gracePeriodEnd: new Date(process.env.COMPETITION_GRACE_END_ISO ?? Date.now()),
        registrationClose: new Date(process.env.COMPETITION_DEADLINE_ISO ?? Date.now()),
      },
    });
    return c;
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "answerkey.upload",
      entityType: "data_file",
      entityId: created.id,
      details: { filename: file.name, sha256: put.sha256 },
    },
  });

  revalidatePath("/admin/content/grader");
  return { notice: `Answer key uploaded. Hash: ${put.sha256.slice(0, 16)}…` };
}

export async function uploadGradingScriptAction(
  _prev: GraderUploadState,
  fd: FormData
): Promise<GraderUploadState> {
  const user = await requireAdmin();
  const file = fd.get("file") as File | null;
  if (!file || !(file instanceof File)) return { error: "Please select a file." };

  const err = validateFile(file, {
    maxSizeBytes: 1 * 1024 * 1024,
    allowedExtensions: ["py"],
  });
  if (err) return { error: err };

  const put = await uploadFormFile(file, "private/grading-script");

  const created = await prisma.$transaction(async (tx) => {
    await tx.dataFile.updateMany({
      where: { fileType: "GRADING_SCRIPT", isActive: true },
      data: { isActive: false },
    });
    const c = await tx.dataFile.create({
      data: {
        filename: put.originalFilename,
        description: "Grading script (Python)",
        s3Key: put.key,
        fileSize: put.fileSize,
        sha256: put.sha256,
        mimeType: put.mimeType,
        fileType: "GRADING_SCRIPT",
        uploadedById: user.id,
        isActive: true,
      },
    });
    await tx.competitionSettings.upsert({
      where: { id: 1 },
      update: { activeGradingScriptId: c.id },
      create: {
        id: 1,
        activeGradingScriptId: c.id,
        submissionDeadline: new Date(process.env.COMPETITION_DEADLINE_ISO ?? Date.now()),
        gracePeriodEnd: new Date(process.env.COMPETITION_GRACE_END_ISO ?? Date.now()),
        registrationClose: new Date(process.env.COMPETITION_DEADLINE_ISO ?? Date.now()),
      },
    });
    return c;
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "grading_script.upload",
      entityType: "data_file",
      entityId: created.id,
      details: { filename: file.name, sha256: put.sha256 },
    },
  });

  revalidatePath("/admin/content/grader");
  return { notice: `Grading script uploaded.` };
}
