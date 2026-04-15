import { prisma } from "@/lib/db";
import { GraderUploadClient } from "./GraderUploadClient";

export const dynamic = "force-dynamic";

export default async function AdminGraderPage() {
  const [answerKey, script, settings] = await Promise.all([
    prisma.dataFile.findFirst({
      where: { fileType: "ANSWER_KEY", isActive: true },
      orderBy: { uploadedAt: "desc" },
    }),
    prisma.dataFile.findFirst({
      where: { fileType: "GRADING_SCRIPT", isActive: true },
      orderBy: { uploadedAt: "desc" },
    }),
    prisma.competitionSettings.findUnique({ where: { id: 1 } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Grader</h1>
      <p className="text-neutral-600 mt-1">
        Upload the answer key and the grading script. Neither is ever visible to students.
      </p>
      <GraderUploadClient
        answerKey={
          answerKey
            ? {
                filename: answerKey.filename,
                sha256: answerKey.sha256,
                uploadedAt: answerKey.uploadedAt.toISOString(),
              }
            : null
        }
        script={
          script
            ? {
                filename: script.filename,
                sha256: script.sha256,
                uploadedAt: script.uploadedAt.toISOString(),
              }
            : null
        }
        hasDefaultsConfigured={
          !!settings?.activeAnswerKeyId
        }
      />
    </div>
  );
}
