import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processGradingJob } from "@/lib/grading/process";

export const dynamic = "force-dynamic";

/**
 * Safety-net cron: sweep any QUEUED grading jobs that the inline `after()`
 * path (triggered from the submit action) didn't pick up. Under normal flow
 * the queue stays empty; this catches the edge cases (server restart mid-run,
 * transient grader failure, historical backlog).
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
    select: { id: true },
  });

  const results: Array<{ jobId: string; ok: boolean; error?: string }> = [];
  for (const j of jobs) {
    try {
      await processGradingJob(j.id);
      const final = await prisma.gradingJob.findUnique({
        where: { id: j.id },
        select: { status: true, errorMessage: true },
      });
      results.push({
        jobId: j.id,
        ok: final?.status === "SUCCESS",
        error: final?.status === "ERROR" ? final.errorMessage ?? undefined : undefined,
      });
    } catch (e) {
      results.push({ jobId: j.id, ok: false, error: (e as Error).message });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
