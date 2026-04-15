import { prisma } from "@/lib/db";
import { NDAUploadClient } from "./NDAUploadClient";

export const dynamic = "force-dynamic";

export default async function AdminNDAPage() {
  const ndaFiles = await prisma.dataFile.findMany({
    where: { fileType: "NDA" },
    orderBy: { uploadedAt: "desc" },
    include: { uploadedBy: true },
  });
  const signatures = await prisma.nDASignature.findMany({
    orderBy: { signedAt: "desc" },
    include: { user: true },
    take: 200,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">NDA</h1>
      <p className="text-neutral-600 mt-1">
        Upload the NDA PDF. The hash of each version is recorded; signers are pinned to the version they signed.
      </p>

      <NDAUploadClient
        files={ndaFiles.map((f) => ({
          id: f.id,
          filename: f.filename,
          sha256: f.sha256,
          uploadedAt: f.uploadedAt.toISOString(),
          uploadedBy: f.uploadedBy.name,
          isActive: f.isActive,
        }))}
      />

      <h2 className="font-semibold mt-10">Signatures ({signatures.length})</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50">
            <tr className="text-left">
              <th className="px-4 py-2 font-semibold">Signer</th>
              <th className="px-4 py-2 font-semibold">Typed name</th>
              <th className="px-4 py-2 font-semibold">Hash</th>
              <th className="px-4 py-2 font-semibold">Signed at</th>
              <th className="px-4 py-2 font-semibold">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {signatures.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-2">
                  <div>{s.user.name}</div>
                  <div className="text-xs text-neutral-500">{s.user.email}</div>
                </td>
                <td className="px-4 py-2">{s.typedName}</td>
                <td className="px-4 py-2 font-mono text-xs text-neutral-500">
                  {s.ndaDocumentHash.slice(0, 16)}…
                </td>
                <td className="px-4 py-2 text-neutral-500">
                  {new Date(s.signedAt).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-neutral-500 text-xs">{s.ipAddress}</td>
              </tr>
            ))}
            {signatures.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                  No signatures yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
