type Milestone = {
  date: string;
  label: string;
  description?: string;
  status: "upcoming" | "active" | "completed";
};

export const defaultMilestones: Milestone[] = [
  {
    date: "Apr 17",
    label: "Competition announced",
    description: "Website live. Team registration opens.",
    status: "completed",
  },
  {
    date: "Apr 20",
    label: "Kickoff & data released",
    description: "Horizon Hobby briefing. Data package available after NDA.",
    status: "upcoming",
  },
  {
    date: "Apr 27",
    label: "Q&A session",
    description: "Follow-up clarifications from Horizon Hobby.",
    status: "upcoming",
  },
  {
    date: "May 1",
    label: "Submissions due",
    description: "All four components due by 11:59 PM Central.",
    status: "upcoming",
  },
  {
    date: "May 3",
    label: "Finalists notified",
    description: "Top three teams announced.",
    status: "upcoming",
  },
  {
    date: "May 7",
    label: "Final presentations",
    description: "Finalists present to Horizon Hobby. Winners announced.",
    status: "upcoming",
  },
];

export function Timeline({
  milestones = defaultMilestones,
}: {
  milestones?: Milestone[];
}) {
  return (
    <ol className="relative border-l-2 border-neutral-200 ml-3">
      {milestones.map((m, i) => (
        <li key={i} className="pl-6 pb-8 last:pb-0 relative">
          <span
            className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 ${
              m.status === "completed"
                ? "bg-red-700 border-red-700"
                : m.status === "active"
                ? "bg-white border-red-700 ring-2 ring-red-200"
                : "bg-white border-neutral-300"
            }`}
            aria-hidden
          />
          <div className="flex items-baseline gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              {m.date}
            </span>
            <h3 className="font-semibold">{m.label}</h3>
          </div>
          {m.description && (
            <p className="text-sm text-neutral-600 mt-0.5">{m.description}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
