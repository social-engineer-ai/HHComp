import { prisma } from "@/lib/db";
import { BroadcastClient } from "./BroadcastClient";

export const dynamic = "force-dynamic";

export default async function AdminBroadcastPage() {
  const history = await prisma.broadcastMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { author: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Broadcast</h1>
      <p className="text-neutral-600 mt-1">
        Send a message to all registered teams, all complete teams, or just finalists.
      </p>
      <BroadcastClient
        history={history.map((b) => ({
          id: b.id,
          subject: b.subject,
          scope: b.recipientScope,
          sentAt: b.sentAt?.toISOString() ?? b.createdAt.toISOString(),
          successCount: b.successCount,
          failureCount: b.failureCount,
          authorName: b.author.name,
        }))}
      />
    </div>
  );
}
