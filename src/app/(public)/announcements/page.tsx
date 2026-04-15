import { prisma } from "@/lib/db";
import { PublicHeader, PublicFooter } from "@/components/PublicHeader";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  const items = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
    include: { author: true },
  });
  return (
    <>
      <PublicHeader />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>
        <p className="mt-2 text-neutral-600">
          Updates, clarifications, and news from the organizers.
        </p>
        <div className="mt-10 space-y-10">
          {items.length === 0 && (
            <p className="text-neutral-500">No announcements yet.</p>
          )}
          {items.map((a) => (
            <article key={a.id} className="border-b border-neutral-200 pb-8">
              <div className="flex items-center gap-3 text-xs text-neutral-500 mb-2">
                <time>{new Date(a.createdAt).toLocaleString()}</time>
                <span>·</span>
                <span>{a.author.name}</span>
              </div>
              <h2 className="text-xl font-semibold">{a.title}</h2>
              <div className="prose prose-sm text-neutral-700 mt-2 max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{a.body}</ReactMarkdown>
              </div>
            </article>
          ))}
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
