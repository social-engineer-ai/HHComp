import { prisma } from "@/lib/db";
import { PublicHeader, PublicFooter } from "@/components/PublicHeader";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const dynamic = "force-dynamic";

export default async function FAQPage() {
  const items = await prisma.fAQItem.findMany({
    orderBy: { displayOrder: "asc" },
  });
  return (
    <>
      <PublicHeader />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight">Frequently Asked Questions</h1>
        <p className="mt-2 text-neutral-600">
          Updated throughout the competition. Don't see your question? Post it in
          the Q&A session on April 27.
        </p>
        <div className="mt-10 space-y-8">
          {items.length === 0 && (
            <p className="text-neutral-500">
              No FAQ items yet. Check back closer to the kickoff.
            </p>
          )}
          {items.map((q) => (
            <div key={q.id} className="border-b border-neutral-200 pb-6">
              <h2 className="font-semibold text-lg">{q.question}</h2>
              <div className="prose prose-sm text-neutral-700 mt-2 max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{q.answer}</ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
