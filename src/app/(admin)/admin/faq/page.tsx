import { prisma } from "@/lib/db";
import { FAQClient } from "./FAQClient";

export const dynamic = "force-dynamic";

export default async function AdminFAQPage() {
  const items = await prisma.fAQItem.findMany({
    orderBy: { displayOrder: "asc" },
  });
  return (
    <div>
      <h1 className="text-2xl font-semibold">FAQ</h1>
      <p className="text-neutral-600 mt-1">
        Add and remove FAQ items. Answers support Markdown.
      </p>
      <FAQClient
        items={items.map((i) => ({ id: i.id, question: i.question, answer: i.answer }))}
      />
    </div>
  );
}
