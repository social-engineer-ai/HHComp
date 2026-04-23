import { prisma } from "@/lib/db";
import { callGrader } from "./client";
import { sendEmail } from "@/lib/email/client";
import { emailTemplates } from "@/lib/email/templates";

/**
 * Process a single GradingJob end-to-end: status transitions, grader call,
 * Score upsert, and team notification. Shared between the inline upload path
 * (fires via `after()` so the submit action returns fast) and the safety-net
 * cron that sweeps anything that slipped through.
 *
 * Never throws — failures are captured onto the GradingJob row.
 */
export async function processGradingJob(jobId: string): Promise<void> {
  const job = await prisma.gradingJob.findUnique({
    where: { id: jobId },
    include: {
      submission: {
        include: { team: { include: { members: { include: { user: true } } } } },
      },
    },
  });
  if (!job || job.status !== "QUEUED") return;

  await prisma.gradingJob.update({
    where: { id: job.id },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  try {
    const settings = await prisma.competitionSettings.findUnique({ where: { id: 1 } });
    if (!settings?.activeAnswerKeyId) throw new Error("No active answer key configured.");
    const answerKey = await prisma.dataFile.findUnique({ where: { id: settings.activeAnswerKeyId } });
    if (!answerKey) throw new Error("Answer key not found.");

    const script = settings.activeGradingScriptId
      ? await prisma.dataFile.findUnique({ where: { id: settings.activeGradingScriptId } })
      : null;

    const resp = await callGrader({
      submissionS3Key: job.submission.s3Key,
      answerKeyS3Key: answerKey.s3Key,
      scriptS3Key: script?.s3Key ?? null,
    });

    const recipients = job.submission.team.members.map((m) => m.user.email);

    if (!resp.ok || typeof resp.score !== "number" || Number.isNaN(resp.score)) {
      await prisma.gradingJob.update({
        where: { id: job.id },
        data: {
          status: "ERROR",
          finishedAt: new Date(),
          stdout: resp.stdout ?? null,
          stderr: resp.stderr ?? null,
          exitCode: resp.exit_code ?? null,
          errorMessage: resp.error ?? "Unknown grader error",
        },
      });
      try {
        await sendEmail({
          to: recipients,
          ...emailTemplates.scoringError({
            teamName: job.submission.team.name,
            message: resp.error ?? "Unknown grader error",
          }),
        });
      } catch { /* ignore */ }
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.gradingJob.update({
        where: { id: job.id },
        data: {
          status: "SUCCESS",
          finishedAt: new Date(),
          stdout: resp.stdout ?? null,
          stderr: resp.stderr ?? null,
          exitCode: resp.exit_code ?? null,
          scriptVersionHash: script?.sha256 ?? null,
          answerKeyHash: answerKey.sha256,
        },
      });

      const existing = await tx.score.findUnique({ where: { teamId: job.submission.teamId } });
      if (existing) {
        await tx.score.update({
          where: { teamId: job.submission.teamId },
          data: {
            submissionId: job.submissionId,
            gradingJobId: job.id,
            scoreValue: resp.score!,
            scoredAt: new Date(),
            scriptVersionHash: script?.sha256 ?? null,
            isManualOverride: false,
            overrideReason: null,
          },
        });
      } else {
        await tx.score.create({
          data: {
            teamId: job.submission.teamId,
            submissionId: job.submissionId,
            gradingJobId: job.id,
            scoreValue: resp.score!,
            scriptVersionHash: script?.sha256 ?? null,
          },
        });
      }
    });

    try {
      const rank =
        (await prisma.score.count({ where: { scoreValue: { lt: resp.score } } })) + 1;
      await sendEmail({
        to: recipients,
        ...emailTemplates.scoreRecorded({
          teamName: job.submission.team.name,
          score: resp.score,
          rank,
        }),
      });
    } catch { /* ignore */ }
  } catch (e) {
    const msg = (e as Error).message;
    await prisma.gradingJob.update({
      where: { id: job.id },
      data: { status: "ERROR", finishedAt: new Date(), errorMessage: msg },
    });
  }
}
