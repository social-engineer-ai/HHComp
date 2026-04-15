"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser, getTeamForUser } from "@/lib/auth/guards";
import { getNDAStatusForUser } from "@/lib/nda";
import { uploadFormFile, validateFile } from "@/lib/storage/upload-helpers";
import { validatePredictionFile } from "@/lib/validation/prediction-file";
import { getDeadlineInfo, isLate } from "@/lib/time";
import { sendEmail } from "@/lib/email/client";
import { emailTemplates } from "@/lib/email/templates";
import type { SubmissionComponent } from "@prisma/client";

export type SubmitState = { error?: string; notice?: string };

type ComponentRule = {
  maxSizeBytes: number;
  allowedExtensions: string[];
  label: string;
};

const RULES: Record<SubmissionComponent, ComponentRule> = {
  PREDICTION: {
    maxSizeBytes: 10 * 1024 * 1024,
    allowedExtensions: ["xlsx"],
    label: "Prediction file",
  },
  CODE: {
    maxSizeBytes: 50 * 1024 * 1024,
    allowedExtensions: ["py", "ipynb", "r", "zip"],
    label: "Code / model files",
  },
  METHODOLOGY: {
    maxSizeBytes: 25 * 1024 * 1024,
    allowedExtensions: ["pdf"],
    label: "Methodology",
  },
  PRESENTATION: {
    maxSizeBytes: 50 * 1024 * 1024,
    allowedExtensions: ["pptx"],
    label: "Presentation",
  },
};

export async function uploadSubmissionAction(
  _prev: SubmitState,
  fd: FormData
): Promise<SubmitState> {
  const user = await requireUser();
  const team = await getTeamForUser(user.id);
  if (!team) return { error: "You don't have a team." };
  if (team.members.length < 2)
    return { error: "Your team must be complete (2 members) before submitting." };

  const nda = await getNDAStatusForUser(user.id, team.id);
  if (!nda.teamSignedAll)
    return { error: "Both team members must sign the NDA before submitting." };

  const componentRaw = String(fd.get("component") ?? "");
  if (!["PREDICTION", "CODE", "METHODOLOGY", "PRESENTATION"].includes(componentRaw))
    return { error: "Unknown component type." };
  const component = componentRaw as SubmissionComponent;
  const rule = RULES[component];

  const file = fd.get("file") as File | null;
  if (!file || !(file instanceof File)) return { error: "Please select a file." };
  const err = validateFile(file, {
    maxSizeBytes: rule.maxSizeBytes,
    allowedExtensions: rule.allowedExtensions,
  });
  if (err) return { error: err };

  // Deadline check
  const deadline = await getDeadlineInfo();
  if (deadline.state === "closed")
    return { error: "Submissions are closed. The deadline has passed." };

  // For prediction component, structurally validate the Excel file
  let validationStatus: "VALID" | "INVALID_STRUCTURE" = "VALID";
  let validationMessage: string | undefined;
  let buffer: Buffer | null = null;
  if (component === "PREDICTION") {
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
    const result = await validatePredictionFile(buffer);
    if (!result.ok) {
      validationStatus = "INVALID_STRUCTURE";
      validationMessage = result.error;
    }
  }

  // Upload (re-use buffer if we already read it)
  let put;
  if (buffer) {
    const { putObject } = await import("@/lib/storage/s3");
    put = await putObject({
      prefix: `submissions/${team.id}/${component.toLowerCase()}`,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      body: buffer,
    });
  } else {
    put = await uploadFormFile(
      file,
      `submissions/${team.id}/${component.toLowerCase()}`
    );
  }
  const mimeType =
    (put as { mimeType?: string }).mimeType ?? file.type ?? "application/octet-stream";
  const originalFilename =
    (put as { originalFilename?: string }).originalFilename ?? file.name;

  // Transactional: demote old latest for this component, create new latest
  const uploadedAt = new Date();
  const late = isLate(uploadedAt, deadline.primaryDeadline);

  const submission = await prisma.$transaction(async (tx) => {
    const priorLatest = await tx.submission.findFirst({
      where: { teamId: team.id, componentType: component, isLatest: true },
    });
    const nextVersion = priorLatest ? priorLatest.version + 1 : 1;
    if (priorLatest) {
      await tx.submission.update({
        where: { id: priorLatest.id },
        data: { isLatest: false },
      });
    }
    return tx.submission.create({
      data: {
        teamId: team.id,
        componentType: component,
        s3Key: put.key,
        originalFilename,
        fileSize: put.fileSize,
        sha256: put.sha256,
        mimeType,
        uploadedById: user.id,
        version: nextVersion,
        isLatest: true,
        isLate: late,
        validationStatus,
        validationMessage,
      },
    });
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "submission.upload",
      entityType: "submission",
      entityId: submission.id,
      details: { component, filename: file.name, late },
    },
  });

  // Email confirmation
  const recipients = team.members.map((m) => m.user.email);
  try {
    await sendEmail({
      to: recipients,
      ...emailTemplates.submissionComponentUploaded({
        teamName: team.name,
        component: rule.label,
        filename: originalFilename,
        when: uploadedAt.toLocaleString(),
      }),
    });
  } catch {
    /* non-blocking */
  }

  // If all 4 components are now present, send completion notice
  const latestCounts = await prisma.submission.count({
    where: { teamId: team.id, isLatest: true },
  });
  if (latestCounts === 4) {
    try {
      await sendEmail({
        to: recipients,
        ...emailTemplates.submissionComplete({
          teamName: team.name,
          components: ["Prediction", "Code", "Methodology", "Presentation"],
        }),
      });
    } catch {
      /* ignore */
    }
  }

  // If late, also send a late notice
  if (late) {
    try {
      await sendEmail({
        to: recipients,
        ...emailTemplates.lateSubmissionNotice({
          teamName: team.name,
          component: rule.label,
        }),
      });
    } catch {
      /* ignore */
    }
  }

  // For prediction submissions with VALID structure, enqueue a grading job
  if (component === "PREDICTION" && validationStatus === "VALID") {
    await prisma.gradingJob.create({
      data: { submissionId: submission.id, status: "QUEUED" },
    });
  }

  revalidatePath("/submit");
  return {
    notice:
      validationMessage ??
      `${rule.label} uploaded${late ? " (LATE)" : ""}.`,
  };
}
