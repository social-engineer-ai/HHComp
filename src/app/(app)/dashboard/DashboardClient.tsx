"use client";

import { useActionState } from "react";
import { FormError, FormNotice } from "@/components/FormError";
import {
  sendInvitationAction,
  type InviteState,
} from "./actions";

type Member = { userId: string; role: string; name: string; email: string };
type Team = {
  id: string;
  name: string;
  status: string;
  leadUserId: string;
  members: Member[];
};

export function DashboardClient({
  user,
  team,
  pendingInvitation,
}: {
  user: { id: string; name: string; email: string };
  team: Team | null;
  pendingInvitation: { code: string; inviteeEmail: string; expiresAt: string } | null;
}) {
  const [state, formAction, pending] = useActionState<InviteState, FormData>(
    sendInvitationAction,
    {}
  );

  const isLead = team?.leadUserId === user.id;
  const isComplete = team?.members.length === 2;

  return (
    <div className="space-y-6">
      {/* Team card */}
      <section className="rounded-lg border border-neutral-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-neutral-500">Team</p>
            <h2 className="text-xl font-semibold mt-1">{team?.name ?? "—"}</h2>
          </div>
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${
              isComplete
                ? "bg-green-100 text-green-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {isComplete ? "Complete — 2 of 2" : "Incomplete — 1 of 2"}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {team?.members.map((m) => (
            <div
              key={m.userId}
              className="rounded-md border border-neutral-200 px-3 py-2"
            >
              <div className="text-sm font-medium">{m.name}</div>
              <div className="text-xs text-neutral-500">{m.email}</div>
              <div className="text-xs text-neutral-400 mt-1">
                {m.role === "LEAD" ? "Team Lead" : "Member"}
              </div>
            </div>
          ))}
          {team && team.members.length < 2 && (
            <div className="rounded-md border border-dashed border-neutral-300 px-3 py-2 text-sm text-neutral-500">
              Teammate slot open
            </div>
          )}
        </div>

        {/* Invite form */}
        {isLead && !isComplete && (
          <div className="mt-6 border-t border-neutral-200 pt-6">
            <h3 className="text-sm font-semibold mb-3">Invite your teammate</h3>
            <FormError message={state.error} />
            <FormNotice message={state.notice} />
            <form action={formAction} className="mt-3 flex gap-2">
              <input
                name="inviteeEmail"
                type="email"
                required
                placeholder="teammate@illinois.edu"
                className="flex-1 rounded-md border border-neutral-300 px-3 py-2"
              />
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-red-700 px-4 py-2 font-medium text-white hover:bg-red-800 disabled:opacity-60"
              >
                {pending ? "Sending…" : "Send invite"}
              </button>
            </form>
            {pendingInvitation && (
              <div className="mt-4 rounded-md bg-neutral-50 border border-neutral-200 px-4 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Pending invitation</div>
                    <div className="text-neutral-600 text-xs mt-1">
                      To: {pendingInvitation.inviteeEmail}
                    </div>
                  </div>
                  <div className="font-mono tracking-widest text-lg">
                    {pendingInvitation.code}
                  </div>
                </div>
                <p className="text-xs text-neutral-500 mt-2">
                  Share this code directly if the email is delayed. Expires{" "}
                  {new Date(pendingInvitation.expiresAt).toLocaleString()}.
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Next steps */}
      <section className="rounded-lg border border-neutral-200 p-6">
        <h2 className="text-lg font-semibold">Next steps</h2>
        <ol className="mt-3 space-y-2 text-sm">
          <li className={isComplete ? "text-neutral-400 line-through" : ""}>
            1. Complete your team (invite your teammate)
          </li>
          <li className="text-neutral-500">
            2. Both members sign the NDA (available April 20)
          </li>
          <li className="text-neutral-500">3. Download the data package</li>
          <li className="text-neutral-500">4. Submit your four deliverables by May 1</li>
        </ol>
      </section>
    </div>
  );
}
