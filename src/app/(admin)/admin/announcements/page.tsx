import { prisma } from "@/lib/db";
import { AnnouncementsClient } from "./AnnouncementsClient";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  const items = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
    include: { author: true },
  });
  return (
    <div>
      <h1 className="text-2xl font-semibold">Announcements</h1>
      <p className="text-neutral-600 mt-1">
        Create and manage announcements. Markdown supported.
      </p>
      <AnnouncementsClient
        items={items.map((a) => ({
          id: a.id,
          title: a.title,
          body: a.body,
          authorName: a.author.name,
          createdAt: a.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
