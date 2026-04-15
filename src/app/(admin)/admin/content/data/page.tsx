import { prisma } from "@/lib/db";
import { DataFilesClient } from "./DataFilesClient";

export const dynamic = "force-dynamic";

export default async function AdminDataFilesPage() {
  const [files, settings] = await Promise.all([
    prisma.dataFile.findMany({
      where: {
        fileType: { in: ["DATASET", "PREDICTION_TEMPLATE", "COMPETITION_BRIEF"] },
      },
      orderBy: [{ fileType: "asc" }, { displayOrder: "asc" }],
      include: { uploadedBy: true },
    }),
    prisma.competitionSettings.findUnique({ where: { id: 1 } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Data & Files</h1>
      <p className="text-neutral-600 mt-1">
        Upload the competition brief, datasets, and prediction template. Students download
        these after signing the NDA.
      </p>
      <DataFilesClient
        downloadsEnabled={settings?.dataDownloadsEnabled ?? false}
        files={files.map((f) => ({
          id: f.id,
          filename: f.filename,
          description: f.description,
          fileType: f.fileType,
          fileSize: f.fileSize,
          sha256: f.sha256,
          uploadedAt: f.uploadedAt.toISOString(),
          uploadedBy: f.uploadedBy.name,
          isActive: f.isActive,
        }))}
      />
    </div>
  );
}
