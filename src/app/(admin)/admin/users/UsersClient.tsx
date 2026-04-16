"use client";

import { useActionState } from "react";
import { FormError, FormNotice } from "@/components/FormError";
import {
  createStaffAccountAction,
  promoteToManagerAction,
  demoteToStudentAction,
  deactivateUserAction,
  type UserActionState,
} from "./actions";

type TeamMember = {
  userId: string;
  role: string;
  name: string;
  email: string;
  isActive: boolean;
};

type Team = {
  id: string;
  name: string;
  status: string;
  isFinalist: boolean;
  createdAt: string;
  members: TeamMember[];
};

type Staff = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

type StudentNoTeam = { id: string; name: string; email: string };

export function UsersClient({
  teams,
  staff,
  studentsWithoutTeam,
}: {
  teams: Team[];
  staff: Staff[];
  studentsWithoutTeam: StudentNoTeam[];
}) {
  const [createState, createAction, creating] = useActionState<
    UserActionState,
    FormData
  >(createStaffAccountAction, {});

  return (
    <div>
      <h1 className="text-2xl font-semibold">Users & Teams</h1>
      <p className="text-neutral-600 mt-1">
        {teams.length} team{teams.length === 1 ? "" : "s"} · {staff.length} staff account{staff.length === 1 ? "" : "s"}
      </p>

      {/* Create staff account */}
      <section className="mt-8 rounded-lg border border-neutral-200 p-6">
        <h2 className="font-semibold">Create staff account</h2>
        <p className="text-sm text-neutral-600 mt-1">
          Creates a pre-verified Admin or Manager account. Use this for TAs, co-organizers, or yourself.
        </p>
        <FormError message={createState.error} />
        <FormNotice message={createState.notice} />
        <form
          action={createAction}
          className="mt-4 grid gap-3 sm:grid-cols-2 max-w-3xl"
        >
          <input
            name="name"
            type="text"
            required
            placeholder="Full name"
            className="rounded-md border border-neutral-300 px-3 py-2"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="email@anywhere.com"
            className="rounded-md border border-neutral-300 px-3 py-2"
          />
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Temporary password (min 8 chars)"
            className="rounded-md border border-neutral-300 px-3 py-2"
          />
          <select
            name="role"
            required
            defaultValue="MANAGER"
            className="rounded-md border border-neutral-300 px-3 py-2"
          >
            <option value="MANAGER">Manager (near-full access)</option>
            <option value="ADMIN">Admin (full access, can promote others)</option>
          </select>
          <button
            type="submit"
            disabled={creating}
            className="sm:col-span-2 rounded-md bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800 disabled:opacity-60"
          >
            {creating ? "Creating…" : "Create account"}
          </button>
        </form>
      </section>

      {/* Staff accounts */}
      <section className="mt-10">
        <h2 className="font-semibold mb-3">Staff accounts ({staff.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left">
              <tr>
                <th className="px-4 py-2 font-semibold">Name</th>
                <th className="px-4 py-2 font-semibold">Email</th>
                <th className="px-4 py-2 font-semibold">Role</th>
                <th className="px-4 py-2 font-semibold">Created</th>
                <th className="px-4 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {staff.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2">
                    {u.name}
                    {!u.isActive && (
                      <span className="ml-2 text-xs text-neutral-500">(inactive)</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-neutral-600">{u.email}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        u.role === "ADMIN"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-neutral-500 text-xs">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 space-x-2">
                    {u.role === "MANAGER" && (
                      <form
                        action={demoteToStudentAction.bind(null, u.id)}
                        className="inline"
                      >
                        <button className="text-xs text-neutral-600 underline">
                          Demote to student
                        </button>
                      </form>
                    )}
                    {u.role !== "ADMIN" && (
                      <form
                        action={deactivateUserAction.bind(null, u.id)}
                        className="inline"
                      >
                        <button className="text-xs text-red-700 underline">
                          {u.isActive ? "Deactivate" : "Reactivate"}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                    No staff accounts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Promote existing students */}
      {studentsWithoutTeam.length > 0 && (
        <section className="mt-10">
          <h2 className="font-semibold mb-3">
            Promote existing students ({studentsWithoutTeam.length})
          </h2>
          <p className="text-xs text-neutral-500 mb-3">
            Only students without a team can be promoted. Team leads must be removed from their team first.
          </p>
          <div className="space-y-2">
            {studentsWithoutTeam.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-md border border-neutral-200 px-4 py-2"
              >
                <div className="text-sm">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-neutral-500">{s.email}</div>
                </div>
                <form action={promoteToManagerAction.bind(null, s.id)}>
                  <button className="text-xs text-red-700 underline">
                    Promote to Manager
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Teams */}
      <section className="mt-10">
        <h2 className="font-semibold mb-3">Teams ({teams.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left">
              <tr>
                <th className="px-4 py-2 font-semibold">Team</th>
                <th className="px-4 py-2 font-semibold">Status</th>
                <th className="px-4 py-2 font-semibold">Members</th>
                <th className="px-4 py-2 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {teams.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-2 font-medium">{t.name}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        t.status === "COMPLETE"
                          ? "bg-green-100 text-green-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {t.status}
                    </span>
                    {t.isFinalist && (
                      <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                        FINALIST
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="space-y-1">
                      {t.members.map((m) => (
                        <div
                          key={m.userId}
                          className="flex items-center gap-2 flex-wrap"
                        >
                          <div className="flex-1 min-w-0">
                            {m.name}{" "}
                            <span className="text-xs text-neutral-500">({m.email})</span>
                            {m.role === "LEAD" && (
                              <span className="ml-1 text-xs text-red-700">LEAD</span>
                            )}
                            {!m.isActive && (
                              <span className="ml-1 text-xs text-neutral-500">(inactive)</span>
                            )}
                          </div>
                          <form action={deactivateUserAction.bind(null, m.userId)}>
                            <button className="text-xs text-red-700 underline">
                              {m.isActive ? "Deactivate" : "Reactivate"}
                            </button>
                          </form>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-neutral-500">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {teams.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
                    No teams registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
