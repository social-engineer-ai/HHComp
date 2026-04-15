import Link from "next/link";
import { requireUser, getTeamForUser } from "@/lib/auth/guards";
import { getNDAStatusForUser } from "@/lib/nda";
import { getPresignedDownloadUrl } from "@/lib/storage/s3";
import { NDASignClient } from "./NDASignClient";
import { logoutAction } from "../logout/actions";

export const dynamic = "force-dynamic";

export default async function NDAPage() {
  const user = await requireUser();
  const team = await getTeamForUser(user.id);
  const status = await getNDAStatusForUser(user.id, team?.id);

  let pdfUrl: string | null = null;
  if (status.activeFile) {
    pdfUrl = await getPresignedDownloadUrl(
      status.activeFile.s3Key,
      600,
      status.activeFile.filename
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="font-semibold">
            SCM Case Competition 2026
          </Link>
          <form action={logoutAction}>
            <button className="text-sm text-neutral-600 underline">Log out</button>
          </form>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Non-Disclosure Agreement</h1>
        <p className="mt-2 text-neutral-600">
          Both team members must sign the NDA before your team can download the competition data.
        </p>

        {!status.activeFile ? (
          <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
            The NDA document is not yet available. Check back after the April 20 kickoff.
          </div>
        ) : status.currentUserSigned ? (
          <div className="mt-8 rounded-lg border border-green-200 bg-green-50 p-6 text-green-900">
            <div className="font-semibold">You have already signed the NDA.</div>
            <div className="text-sm mt-1">
              Team status: {status.teamSignedCount} of {status.teamTotalCount} members signed.
            </div>
            <Link
              href="/dashboard"
              className="mt-3 inline-block text-sm underline"
            >
              Return to dashboard
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            <div className="rounded-lg border border-neutral-200 overflow-hidden">
              {pdfUrl && (
                <iframe
                  src={pdfUrl}
                  className="w-full h-[70vh] border-0"
                  title="NDA document"
                />
              )}
            </div>

            <NDASignClient registeredName={user.name} />
          </div>
        )}
      </main>
    </div>
  );
}
