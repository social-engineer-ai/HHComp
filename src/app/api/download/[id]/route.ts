import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getTeamForUser } from "@/lib/auth/guards";
import { getNDAStatusForUser } from "@/lib/nda";
import { getPresignedDownloadUrl } from "@/lib/storage/s3";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const { id } = await params;
  const file = await prisma.dataFile.findUnique({ where: { id } });
  if (!file || !file.isActive) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Admin can always download
  if (user.role !== "ADMIN" && user.role !== "MANAGER") {
    // Student access gating
    const settings = await prisma.competitionSettings.findUnique({ where: { id: 1 } });
    if (!settings?.dataDownloadsEnabled) {
      return NextResponse.json({ error: "Downloads disabled" }, { status: 403 });
    }
    // Only DATASET / PREDICTION_TEMPLATE / COMPETITION_BRIEF are exposed to students
    if (
      !["DATASET", "PREDICTION_TEMPLATE", "COMPETITION_BRIEF"].includes(file.fileType)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const team = await getTeamForUser(user.id);
    const nda = await getNDAStatusForUser(user.id, team?.id);
    if (!nda.teamSignedAll) {
      return NextResponse.json({ error: "NDA not complete" }, { status: 403 });
    }
  }

  // Log the download
  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    null;
  await prisma.dataDownloadLog.create({
    data: { userId: user.id, dataFileId: file.id, ipAddress },
  });

  const signed = await getPresignedDownloadUrl(file.s3Key, 120, file.filename);
  return NextResponse.redirect(signed, 302);
}
