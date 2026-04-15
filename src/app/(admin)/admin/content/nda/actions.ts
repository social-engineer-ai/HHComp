"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { uploadFormFile, validateFile } from "@/lib/storage/upload-helpers";

export type NDAUploadState = { error?: string; notice?: string };

export async function uploadNDAAction(
  _prev: NDAUploadState,
  fd: FormData
): Promise<NDAUploadState> {
  const user = await requireAdmin();
  const file = fd.get("file") as File | null;
  const description = String(fd.get("description") ?? "NDA");

  if (!file || !(file instanceof File)) return { error: "Please select a PDF file." };

  const err = validateFile(file, {
    maxSizeBytes: 10 * 1024 * 1024,
    allowedExtensions: ["pdf"],
    allowedMimeTypes: ["application/pdf"],
  });
  if (err) return { error: err };

  const put = await uploadFormFile(file, "nda");

  const dataFile = await prisma.$transaction(async (tx) => {
    // Deactivate prior NDA files
    await tx.dataFile.updateMany({
      where: { fileType: "NDA", isActive: true },
      data: { isActive: false },
    });
    const created = await tx.dataFile.create({
      data: {
        filename: put.originalFilename,
        description,
        s3Key: put.key,
        fileSize: put.fileSize,
        sha256: put.sha256,
        mimeType: put.mimeType,
        fileType: "NDA",
        uploadedById: user.id,
        isActive: true,
      },
    });
    await tx.competitionSettings.upsert({
      where: { id: 1 },
      update: { activeNdaFileId: created.id },
      create: {
        id: 1,
        activeNdaFileId: created.id,
        submissionDeadline: new Date(process.env.COMPETITION_DEADLINE_ISO ?? Date.now()),
        gracePeriodEnd: new Date(process.env.COMPETITION_GRACE_END_ISO ?? Date.now()),
        registrationClose: new Date(process.env.COMPETITION_DEADLINE_ISO ?? Date.now()),
      },
    });
    return created;
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "nda.upload",
      entityType: "data_file",
      entityId: dataFile.id,
      details: { filename: file.name, sha256: put.sha256 },
    },
  });

  revalidatePath("/admin/content/nda");
  revalidatePath("/nda");
  return { notice: `NDA uploaded. SHA-256: ${put.sha256.slice(0, 16)}…` };
}
