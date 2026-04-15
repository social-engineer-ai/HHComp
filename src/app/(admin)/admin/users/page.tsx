import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const teams = await prisma.team.findMany({
    include: {
      members: { include: { user: true } },
      lead: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const totalUsers = await prisma.user.count();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Users & Teams</h1>
      <p className="text-neutral-600 mt-1">
        {teams.length} team{teams.length === 1 ? "" : "s"} · {totalUsers} user{totalUsers === 1 ? "" : "s"}
      </p>
      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left">
            <tr>
              <th className="px-4 py-2 font-semibold">Team</th>
              <th className="px-4 py-2 font-semibold">Status</th>
              <th className="px-4 py-2 font-semibold">Members</th>
              <th className="px-4 py-2 font-semibold">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {teams.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      t.status === "COMPLETE"
                        ? "bg-green-100 text-green-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {t.status}
                  </span>
                  {t.isFinalist && (
                    <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      FINALIST
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-0.5">
                    {t.members.map((m) => (
                      <div key={m.userId}>
                        {m.user.name}{" "}
                        <span className="text-xs text-neutral-500">({m.user.email})</span>
                        {m.role === "LEAD" && (
                          <span className="ml-1 text-xs text-red-700">LEAD</span>
                        )}
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-neutral-500">
                  {new Date(t.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {teams.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
                  No teams registered yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
