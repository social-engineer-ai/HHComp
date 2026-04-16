import Link from "next/link";
import { requireUser, getTeamForUser } from "@/lib/auth/guards";
import { getNDAStatusForUser } from "@/lib/nda";
import { prisma } from "@/lib/db";
import { getDeadlineInfo } from "@/lib/time";
import { SubmitClient } from "./SubmitClient";
import { logoutAction } from "../logout/actions";
import type { SubmissionComponent } from "@prisma/client";

export const dynamic = "force-dynamic";

const COMPONENTS: {
  key: SubmissionComponent;
  label: string;
  description: string;
  accept: string;
  maxMb: number;
}[] = [
  {
    key: "PREDICTION",
    label: "Prediction file",
    description:
      "Completed template with monthly attach rate forecasts for the three held-back parts.",
    accept: ".xlsx",
    maxMb: 10,
  },
  {
    key: "CODE",
    label: "Code / model files",
    description: ".py, .ipynb, .r, or a ZIP archive of your code.",
    accept: ".py,.ipynb,.r,.zip",
    maxMb: 50,
  },
  {
    key: "METHODOLOGY",
    label: "Methodology",
    description: "PDF explaining your analytical approach, assumptions, and model design.",
    accept: ".pdf",
    maxMb: 25,
  },
  {
    key: "PRESENTATION",
    label: "Presentation",
    description: "PowerPoint deck: current state, data, predictions, and recommendations.",
    accept: ".pptx",
    maxMb: 50,
  },
];

export default async function SubmitPage() {
  const user = await requireUser();
  const team = await getTeamForUser(user.id);
  if (!team) {
    return (
      <div className="p-8">
        <p>You need a team to submit.</p>
        <Link href="/dashboard" className="text-red-700 underline">Dashboard</Link>
      </div>
    );
  }

  const [nda, submissions, deadline] = await Promise.all([
    getNDAStatusForUser(user.id, team.id),
    prisma.submission.findMany({
      where: { teamId: team.id },
      orderBy: { uploadedAt: "desc" },
    }),
    getDeadlineInfo(),
  ]);

  const latestByComponent = new Map<SubmissionComponent, (typeof submissions)[number]>();
  for (const s of submissions) {
    if (s.isLatest) latestByComponent.set(s.componentType, s);
  }

  const allUploaded = COMPONENTS.every((c) => latestByComponent.has(c.key));

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="font-semibold">
            SCM Analytics Competition 2026
          </Link>
          <form action={logoutAction}>
            <button className="text-sm text-neutral-600 underline">Log out</button>
          </form>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Submissions</h1>
            <p className="mt-1 text-neutral-600">
              Upload each of the four components. You can replace any component before the
              deadline; the latest version is what gets scored.
            </p>
          </div>
          <DeadlineBadge state={deadline.state} primaryDeadline={deadline.primaryDeadline} />
        </div>

        {!nda.teamSignedAll ? (
          <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
            Both team members must sign the NDA before submitting.{" "}
            <Link href="/nda" className="underline">Go to NDA</Link>
          </div>
        ) : deadline.state === "closed" ? (
          <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-6 text-red-900">
            Submissions are closed.
          </div>
        ) : (
          <>
            {allUploaded && (
              <div className="mt-8 rounded-lg border border-green-200 bg-green-50 p-6 text-green-900">
                <div className="font-semibold">All four components uploaded.</div>
                <div className="text-sm mt-1">
                  You can still replace any component before{" "}
                  {deadline.primaryDeadline.toLocaleString()}.
                </div>
              </div>
            )}
            <SubmitClient
              components={COMPONENTS}
              latest={Object.fromEntries(
                Array.from(latestByComponent.entries()).map(([k, v]) => [
                  k,
                  {
                    filename: v.originalFilename,
                    uploadedAt: v.uploadedAt.toISOString(),
                    version: v.version,
                    isLate: v.isLate,
                    validationStatus: v.validationStatus,
                    validationMessage: v.validationMessage,
                  },
                ])
              )}
              history={submissions
                .filter((s) => !s.isLatest)
                .map((s) => ({
                  id: s.id,
                  component: s.componentType,
                  filename: s.originalFilename,
                  uploadedAt: s.uploadedAt.toISOString(),
                  version: s.version,
                }))}
            />
          </>
        )}
      </main>
    </div>
  );
}

function DeadlineBadge({
  state,
  primaryDeadline,
}: {
  state: "open" | "grace" | "closed";
  primaryDeadline: Date;
}) {
  const color =
    state === "open"
      ? "bg-green-100 text-green-800"
      : state === "grace"
      ? "bg-amber-100 text-amber-800"
      : "bg-red-100 text-red-800";
  const label =
    state === "open"
      ? "Open"
      : state === "grace"
      ? "Grace period"
      : "Closed";
  return (
    <div className="text-right">
      <div className={`inline-block text-xs font-medium px-2 py-1 rounded-full ${color}`}>
        {label}
      </div>
      <div className="text-xs text-neutral-500 mt-1">
        Due {primaryDeadline.toLocaleString()}
      </div>
    </div>
  );
}
