import Link from "next/link";
import type { ReactNode } from "react";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">
            SCM Analytics Competition 2026
          </Link>
          <nav className="text-sm text-neutral-600 flex gap-5">
            <Link href="/" className="hover:text-neutral-900">Home</Link>
            <Link href="/faq" className="hover:text-neutral-900">FAQ</Link>
            <Link href="/announcements" className="hover:text-neutral-900">Announcements</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 flex items-start justify-center py-12 px-6">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-semibold tracking-tight mb-1">{title}</h1>
          {subtitle && <p className="text-sm text-neutral-600 mb-6">{subtitle}</p>}
          <div className="mt-6 space-y-4">{children}</div>
          {footer && <div className="mt-6 text-sm text-neutral-600">{footer}</div>}
        </div>
      </main>
      <footer className="border-t border-neutral-200 text-xs text-neutral-500">
        <div className="max-w-6xl mx-auto px-6 py-6">
          Gies College of Business × Horizon Hobby
        </div>
      </footer>
    </div>
  );
}
