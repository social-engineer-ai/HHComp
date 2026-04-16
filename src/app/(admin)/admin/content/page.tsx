import Link from "next/link";

export default function AdminContentIndex() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Content management</h1>
      <p className="text-neutral-600 mt-1">
        Upload and manage all files students and the grader depend on.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card
          href="/admin/content/nda"
          title="NDA"
          description="Upload and version the NDA PDF students sign."
        />
        <Card
          href="/admin/content/data"
          title="Data files"
          description="Competition brief, dataset, and prediction template. Student-facing downloads."
        />
        <Card
          href="/admin/content/grader"
          title="Grader"
          description="Answer key and optional grading script. Never visible to students."
        />
      </div>
    </div>
  );
}

function Card({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-neutral-200 p-5 hover:border-red-300 bg-white"
    >
      <h2 className="font-semibold">{title}</h2>
      <p className="text-sm text-neutral-600 mt-1">{description}</p>
    </Link>
  );
}
