import { prisma } from "@/lib/db";

export type NDAStatus = {
  activeFile: {
    id: string;
    filename: string;
    s3Key: string;
    sha256: string;
  } | null;
  currentUserSigned: boolean;
  teamSignedCount: number;
  teamTotalCount: number;
  teamSignedAll: boolean;
};

export async function getNDAStatusForUser(
  userId: string,
  teamId?: string | null
): Promise<NDAStatus> {
  const activeFile = await prisma.dataFile.findFirst({
    where: { fileType: "NDA", isActive: true },
    orderBy: { uploadedAt: "desc" },
  });

  if (!activeFile) {
    return {
      activeFile: null,
      currentUserSigned: false,
      teamSignedCount: 0,
      teamTotalCount: 0,
      teamSignedAll: false,
    };
  }

  const currentUserSig = await prisma.nDASignature.findFirst({
    where: {
      userId,
      ndaDocumentHash: activeFile.sha256,
    },
  });

  let teamSignedCount = 0;
  let teamTotalCount = 0;
  if (teamId) {
    const members = await prisma.teamMembership.findMany({
      where: { teamId },
      select: { userId: true },
    });
    teamTotalCount = members.length;
    const memberIds = members.map((m) => m.userId);
    if (memberIds.length > 0) {
      teamSignedCount = await prisma.nDASignature.count({
        where: {
          userId: { in: memberIds },
          ndaDocumentHash: activeFile.sha256,
        },
      });
    }
  }

  return {
    activeFile: {
      id: activeFile.id,
      filename: activeFile.filename,
      s3Key: activeFile.s3Key,
      sha256: activeFile.sha256,
    },
    currentUserSigned: !!currentUserSig,
    teamSignedCount,
    teamTotalCount,
    teamSignedAll: teamTotalCount > 0 && teamSignedCount === teamTotalCount,
  };
}
