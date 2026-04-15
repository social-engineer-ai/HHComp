"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { uploadFormFile, validateFile } from "@/lib/storage/upload-helpers";
import { deleteObject } from "@/lib/storage/s3";
import type { DataFileType } from "@prisma/client";

export type DataUploadState = { error?: string; notice?: string };

export async function uploadDataFileAction(
  _prev: DataUploadState,
  fd: FormData
): Promise<DataUploadState> {
  const user = await requireAdmin();
  const file = fd.get("file") as File | null;
  const description = String(fd.get("description") ?? "");
  const fileTypeRaw = String(fd.get("fileType") ?? "DATASET");

  if (!file || !(file instanceof File))
    return { error: "Please select a file to upload." };

  const err = validateFile(file, {
    maxSizeBytes: 200 * 1024 * 1024,
    allowedExtensions: ["pdf", "docx", "xlsx", "xls", "csv", "zip", "txt", "md", "json", "py", "ipynb"],
  });
  if (err) return { error: err };

  const validTypes: DataFileType[] = [
    "DATASET",
    "PREDICTION_TEMPLATE",
    "COMPETITION_BRIEF",
  ];
  const fileType = validTypes.includes(fileTypeRaw as DataFileType)
    ? (fileTypeRaw as DataFileType)
    : "DATASET";

  const put = await uploadFormFile(file, `data/${fileType.toLowerCase()}`);

  const max = await prisma.dataFile.aggregate({
    where: { fileType },
    _max: { displayOrder: true },
  });

  const created = await prisma.dataFile.create({
    data: {
      filename: put.originalFilename,
      description,
      s3Key: put.key,
      fileSize: put.fileSize,
      sha256: put.sha256,
      mimeType: put.mimeType,
      fileType,
      uploadedById: user.id,
      isActive: true,
      displayOrder: (max._max.displayOrder ?? 0) + 1,
    },
  });

  // If this is a PREDICTION_TEMPLATE, wire it into settings
  if (fileType === "PREDICTION_TEMPLATE") {
    await prisma.competitionSettings.upsert({
      where: { id: 1 },
      update: { activePredictionTemplateId: created.id },
      create: {
        id: 1,
        activePredictionTemplateId: created.id,
        submissionDeadline: new Date(process.env.COMPETITION_DEADLINE_ISO ?? Date.now()),
        gracePeriodEnd: new Date(process.env.COMPETITION_GRACE_END_ISO ?? Date.now()),
        registrationClose: new Date(process.env.COMPETITION_DEADLINE_ISO ?? Date.now()),
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "datafile.upload",
      entityType: "data_file",
      entityId: created.id,
      details: { filename: file.name, fileType, sha256: put.sha256 },
    },
  });

  revalidatePath("/admin/content/data");
  revalidatePath("/data");
  return { notice: `Uploaded ${file.name}` };
}

export async function toggleDataFileAction(id: string) {
  const user = await requireAdmin();
  const file = await prisma.dataFile.findUnique({ where: { id } });
  if (!file) return;
  await prisma.dataFile.update({
    where: { id },
    data: { isActive: !file.isActive },
  });
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: file.isActive ? "datafile.deactivate" : "datafile.activate",
      entityType: "data_file",
      entityId: id,
    },
  });
  revalidatePath("/admin/content/data");
  revalidatePath("/data");
}

export async function deleteDataFileAction(id: string) {
  const user = await requireAdmin();
  const file = await prisma.dataFile.findUnique({ where: { id } });
  if (!file) return;
  try {
    await deleteObject(file.s3Key);
  } catch (e) {
    console.warn("S3 delete failed:", (e as Error).message);
  }
  await prisma.dataFile.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "datafile.delete",
      entityType: "data_file",
      entityId: id,
      details: { filename: file.filename },
    },
  });
  revalidatePath("/admin/content/data");
  revalidatePath("/data");
}

export async function toggleDataDownloadsAction(
  _prev: DataUploadState,
  _fd: FormData
): Promise<DataUploadState> {
  await requireAdmin();
  const settings = await prisma.competitionSettings.findUnique({ where: { id: 1 } });
  if (!settings) return { error: "Settings not initialized." };
  await prisma.competitionSettings.update({
    where: { id: 1 },
    data: { dataDownloadsEnabled: !settings.dataDownloadsEnabled },
  });
  revalidatePath("/admin/content/data");
  revalidatePath("/data");
  revalidatePath("/dashboard");
  return {
    notice: `Data downloads are now ${!settings.dataDownloadsEnabled ? "ENABLED" : "DISABLED"}.`,
  };
}
