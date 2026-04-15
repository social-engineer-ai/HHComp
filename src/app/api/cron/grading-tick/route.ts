import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { callGrader } from "@/lib/grading/client";
import { sendEmail } from "@/lib/email/client";
import { emailTemplates } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

/**
 * Invoked by a cron (or manual admin trigger) to process queued grading jobs.
 * Processes up to MAX_BATCH jobs per invocation.
 */
const MAX_BATCH = 5;

export async function POST(req: NextRequest) {
  const auth = req.headers.get("x-cron-secret");
  const expected = process.env.GRADER_SHARED_SECRET ?? "";
  if (!expected || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobs = await prisma.gradingJob.findMany({
    where: { status: "QUEUED" },
    orderBy: { createdAt: "asc" },
    take: MAX_BATCH,
    include: {
      submission: { include: { team: { include: { members: { include: { user: true } } } } } },
    },
  });

  const results: Array<{ jobId: string; ok: boolean; error?: string }> = [];

  for (const job of jobs) {
    await prisma.gradingJob.update({
      where: { id: job.id },
      data: { status: "RUNNING", startedAt: new Date() },
    });

    try {
      const settings = await prisma.competitionSettings.findUnique({ where: { id: 1 } });
      if (!settings?.activeAnswerKeyId) {
        throw new Error("No active answer key configured.");
      }
      const answerKey = await prisma.dataFile.findUnique({
        where: { id: settings.activeAnswerKeyId },
      });
      if (!answerKey) throw new Error("Answer key not found.");

      const script = settings.activeGradingScriptId
        ? await prisma.dataFile.findUnique({
            where: { id: settings.activeGradingScriptId },
          })
        : null;

      const resp = await callGrader({
        submissionS3Key: job.submission.s3Key,
        answerKeyS3Key: answerKey.s3Key,
        scriptS3Key: script?.s3Key ?? null,
      });

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
        // Email the team
        try {
          const recipients = job.submission.team.members.map((m) => m.user.email);
          await sendEmail({
            to: recipients,
            ...emailTemplates.scoringError({
              teamName: job.submission.team.name,
              message: resp.error ?? "Unknown grader error",
            }),
          });
        } catch { /* ignore */ }
        results.push({ jobId: job.id, ok: false, error: resp.error });
        continue;
      }

      // Upsert score (one per team, always pointing at latest)
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

        const existing = await tx.score.findUnique({
          where: { teamId: job.submission.teamId },
        });
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

      // Email the team with score
      try {
        const recipients = job.submission.team.members.map((m) => m.user.email);
        // Compute current rank
        const rank =
          (await prisma.score.count({
            where: { scoreValue: { lt: resp.score } },
          })) + 1;
        await sendEmail({
          to: recipients,
          ...emailTemplates.scoreRecorded({
            teamName: job.submission.team.name,
            score: resp.score,
            rank,
          }),
        });
      } catch { /* ignore */ }

      results.push({ jobId: job.id, ok: true });
    } catch (e) {
      const msg = (e as Error).message;
      await prisma.gradingJob.update({
        where: { id: job.id },
        data: {
          status: "ERROR",
          finishedAt: new Date(),
          errorMessage: msg,
        },
      });
      results.push({ jobId: job.id, ok: false, error: msg });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}

export async function GET(req: NextRequest) {
  // Allow GET for cron-friendly invocation
  return POST(req);
}
