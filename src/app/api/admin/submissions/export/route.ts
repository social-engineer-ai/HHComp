import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * Returns a CSV manifest of all latest submissions with per-file presigned URLs.
 * Bulk ZIP streaming is deferred; this manifest is easier for admins to triage.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subs = await prisma.submission.findMany({
    where: { isLatest: true },
    orderBy: [{ teamId: "asc" }, { componentType: "asc" }],
    include: { team: true },
  });

  const { getPresignedDownloadUrl } = await import("@/lib/storage/s3");

  const rows: string[] = [];
  rows.push("team,component,filename,size_bytes,uploaded_at,late,version,sha256,download_url");
  for (const s of subs) {
    const url = await getPresignedDownloadUrl(s.s3Key, 3600, s.originalFilename);
    rows.push(
      [
        JSON.stringify(s.team.name),
        s.componentType,
        JSON.stringify(s.originalFilename),
        s.fileSize,
        s.uploadedAt.toISOString(),
        s.isLate,
        s.version,
        s.sha256,
        JSON.stringify(url),
      ].join(",")
    );
  }

  return new NextResponse(rows.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="submissions-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
