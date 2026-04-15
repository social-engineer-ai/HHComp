import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true },
    take: 500,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Audit log</h1>
      <p className="text-neutral-600 mt-1">
        Last {logs.length} admin and system actions.
      </p>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left">
            <tr>
              <th className="px-4 py-2 font-semibold">When</th>
              <th className="px-4 py-2 font-semibold">Who</th>
              <th className="px-4 py-2 font-semibold">Action</th>
              <th className="px-4 py-2 font-semibold">Entity</th>
              <th className="px-4 py-2 font-semibold">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2 text-xs text-neutral-500 whitespace-nowrap">
                  {new Date(l.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-2">{l.user?.name ?? <em className="text-neutral-400">system</em>}</td>
                <td className="px-4 py-2 font-mono text-xs">{l.action}</td>
                <td className="px-4 py-2 text-xs">
                  {l.entityType}
                  {l.entityId && <span className="text-neutral-400"> · {l.entityId.slice(0, 8)}</span>}
                </td>
                <td className="px-4 py-2 text-xs text-neutral-500 max-w-sm truncate">
                  {l.details ? JSON.stringify(l.details) : ""}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                  No audit entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
