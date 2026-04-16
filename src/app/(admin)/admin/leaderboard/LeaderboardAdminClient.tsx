"use client";

import { useActionState } from "react";
import { FormError, FormNotice } from "@/components/FormError";
import {
  setLeaderboardVisibilityAction,
  rescoreAllAction,
  overrideScoreAction,
  type LBState,
} from "./actions";

type ScoreRow = {
  rank: number;
  id: string;
  teamId: string;
  teamName: string;
  isFinalist: boolean;
  scoreValue: number;
  isManualOverride: boolean;
  isLate: boolean;
  scoredAt: string;
};

type UnscoredTeam = {
  teamId: string;
  teamName: string;
  isFinalist: boolean;
};

type JobRow = {
  id: string;
  status: string;
  teamName: string;
  createdAt: string;
  finishedAt: string | null;
  errorMessage: string | null;
};

export function LeaderboardAdminClient({
  visibility,
  scores,
  unscoredTeams,
  recentJobs,
}: {
  visibility: string;
  scores: ScoreRow[];
  unscoredTeams: UnscoredTeam[];
  recentJobs: JobRow[];
}) {
  const [overrideState, overrideAction, overriding] = useActionState<LBState, FormData>(
    overrideScoreAction,
    {}
  );

  return (
    <div className="mt-6 space-y-10">
      <section className="rounded-lg border border-neutral-200 p-6">
        <h2 className="font-semibold mb-3">Controls</h2>
        <div className="flex flex-wrap gap-2">
          {(["VISIBLE", "FROZEN", "HIDDEN"] as const).map((v) => (
            <form key={v} action={setLeaderboardVisibilityAction.bind(null, v)}>
              <button
                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                  visibility === v
                    ? "bg-red-700 text-white"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                }`}
              >
                Set {v}
              </button>
            </form>
          ))}
          <form action={rescoreAllAction}>
            <button className="rounded-md bg-neutral-100 text-neutral-700 hover:bg-neutral-200 px-3 py-1.5 text-sm font-semibold">
              Re-score all
            </button>
          </form>
          <a
            href="/api/admin/leaderboard/export"
            className="rounded-md bg-neutral-100 text-neutral-700 hover:bg-neutral-200 px-3 py-1.5 text-sm font-semibold"
          >
            Export CSV
          </a>
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Scores ({scores.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left">
              <tr>
                <th className="px-4 py-2 font-semibold">Rank</th>
                <th className="px-4 py-2 font-semibold">Team</th>
                <th className="px-4 py-2 font-semibold text-right">wMAPE</th>
                <th className="px-4 py-2 font-semibold">Scored at</th>
                <th className="px-4 py-2 font-semibold">Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {scores.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2 font-semibold">#{s.rank}</td>
                  <td className="px-4 py-2">
                    {s.teamName}
                    {s.isFinalist && (
                      <span className="ml-2 text-xs font-medium px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                        FINALIST
                      </span>
                    )}
                    {s.isManualOverride && (
                      <span className="ml-2 text-xs text-amber-700">(override)</span>
                    )}
                    {s.isLate && (
                      <span className="ml-1 text-xs font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-800">
                        LATE
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">{s.scoreValue.toFixed(4)}</td>
                  <td className="px-4 py-2 text-neutral-500 text-xs">
                    {new Date(s.scoredAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <form action={overrideAction} className="flex gap-1">
                      <input type="hidden" name="teamId" value={s.teamId} />
                      <input
                        name="value"
                        type="number"
                        step="0.0001"
                        placeholder="New"
                        className="w-20 rounded border border-neutral-300 px-1.5 py-0.5 text-xs"
                      />
                      <input
                        name="reason"
                        type="text"
                        placeholder="Reason"
                        className="w-28 rounded border border-neutral-300 px-1.5 py-0.5 text-xs"
                      />
                      <button className="text-xs text-red-700 underline" disabled={overriding}>
                        Save
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {scores.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                    No scores yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <FormError message={overrideState.error} />
        <FormNotice message={overrideState.notice} />
      </section>

      {unscoredTeams.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3">
            Complete teams without scores ({unscoredTeams.length})
          </h2>
          <p className="text-xs text-neutral-500 mb-3">
            These teams have finished registration but don&apos;t have a score yet, either because
            the grader hasn&apos;t run, the answer key isn&apos;t uploaded, or the team hasn&apos;t submitted a
            prediction file. You can enter a manual score here (requires the team to have
            uploaded a prediction file first).
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left">
                <tr>
                  <th className="px-4 py-2 font-semibold">Team</th>
                  <th className="px-4 py-2 font-semibold">Manual score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {unscoredTeams.map((t) => (
                  <tr key={t.teamId}>
                    <td className="px-4 py-2">
                      {t.teamName}
                      {t.isFinalist && (
                        <span className="ml-2 text-xs font-medium px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                          FINALIST
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <form action={overrideAction} className="flex gap-1">
                        <input type="hidden" name="teamId" value={t.teamId} />
                        <input
                          name="value"
                          type="number"
                          step="0.0001"
                          placeholder="wMAPE"
                          required
                          className="w-20 rounded border border-neutral-300 px-1.5 py-0.5 text-xs"
                        />
                        <input
                          name="reason"
                          type="text"
                          placeholder="Reason (required)"
                          required
                          className="w-36 rounded border border-neutral-300 px-1.5 py-0.5 text-xs"
                        />
                        <button className="text-xs text-red-700 underline" disabled={overriding}>
                          Create
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2 className="font-semibold mb-3">Recent grading jobs</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left">
              <tr>
                <th className="px-4 py-2 font-semibold">Team</th>
                <th className="px-4 py-2 font-semibold">Status</th>
                <th className="px-4 py-2 font-semibold">Created</th>
                <th className="px-4 py-2 font-semibold">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {recentJobs.map((j) => (
                <tr key={j.id}>
                  <td className="px-4 py-2">{j.teamName}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        j.status === "SUCCESS"
                          ? "bg-green-100 text-green-800"
                          : j.status === "ERROR"
                          ? "bg-red-100 text-red-800"
                          : j.status === "RUNNING"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {j.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-neutral-500 text-xs">
                    {new Date(j.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-xs text-red-700 truncate max-w-xs">
                    {j.errorMessage ?? ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
