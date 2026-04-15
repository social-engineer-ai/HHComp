import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { logoutAction } from "../../(app)/logout/actions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <div className="min-h-screen grid md:grid-cols-[240px_1fr]">
      <aside className="border-r border-neutral-200 bg-neutral-50">
        <div className="px-6 py-5 border-b border-neutral-200">
          <Link href="/admin" className="font-semibold">
            Admin
          </Link>
          <p className="text-xs text-neutral-500 mt-1">{user.name}</p>
          <p className="text-xs text-neutral-400">{user.role}</p>
        </div>
        <nav className="p-4 text-sm space-y-1">
          {[
            ["/admin", "Dashboard"],
            ["/admin/users", "Users & Teams"],
            ["/admin/announcements", "Announcements"],
            ["/admin/faq", "FAQ"],
            ["/admin/content", "Data & Files"],
            ["/admin/submissions", "Submissions"],
            ["/admin/leaderboard", "Leaderboard"],
            ["/admin/broadcast", "Broadcast"],
            ["/admin/settings", "Settings"],
            ["/admin/audit", "Audit log"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="block rounded-md px-3 py-2 hover:bg-neutral-200 text-neutral-700"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-neutral-200 mt-auto">
          <form action={logoutAction}>
            <button className="text-xs text-neutral-500 underline">Log out</button>
          </form>
        </div>
      </aside>
      <main className="p-8 max-w-5xl">{children}</main>
    </div>
  );
}
