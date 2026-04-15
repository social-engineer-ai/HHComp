import { prisma } from "@/lib/db";
import { SettingsClient } from "./SettingsClient";

export const dynamic = "force-dynamic";

function toLocalInput(d: Date | null | undefined): string {
  if (!d) return "";
  // yyyy-MM-ddTHH:mm (local-ish — the admin enters CT, stored as UTC)
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function AdminSettingsPage() {
  const s = await prisma.competitionSettings.findUnique({ where: { id: 1 } });
  return (
    <div>
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="text-neutral-600 mt-1">Competition dates and deadlines.</p>
      <SettingsClient
        initial={{
          submissionDeadline: toLocalInput(s?.submissionDeadline),
          gracePeriodEnd: toLocalInput(s?.gracePeriodEnd),
          registrationClose: toLocalInput(s?.registrationClose),
        }}
      />
    </div>
  );
}
