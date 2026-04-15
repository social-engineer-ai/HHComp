import Link from "next/link";

export function PublicHeader() {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight">
          SCM Case Competition 2026
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/#timeline" className="text-neutral-700 hover:text-neutral-900">
            Timeline
          </Link>
          <Link href="/faq" className="text-neutral-700 hover:text-neutral-900">
            FAQ
          </Link>
          <Link href="/announcements" className="text-neutral-700 hover:text-neutral-900">
            Announcements
          </Link>
          <Link
            href="/login"
            className="text-neutral-700 hover:text-neutral-900"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-md bg-red-700 px-4 py-2 font-medium text-white hover:bg-red-800"
          >
            Register
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50 mt-20">
      <div className="max-w-6xl mx-auto px-6 py-10 text-sm text-neutral-600">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <div className="font-semibold text-neutral-900">
              Supply Chain Case Competition 2026
            </div>
            <p className="mt-2">
              Presented by Horizon Hobby and the Gies College of Business at the
              University of Illinois Urbana-Champaign.
            </p>
          </div>
          <div>
            <div className="font-semibold text-neutral-900">Horizon Hobby</div>
            <ul className="mt-2 space-y-1">
              <li>
                <a
                  href="https://www.horizonhobby.com/"
                  className="underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  horizonhobby.com
                </a>
              </li>
              <li>
                <a
                  href="https://www.towerhobbies.com/"
                  className="underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  towerhobbies.com
                </a>
              </li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-neutral-900">Questions?</div>
            <p className="mt-2">
              Contact the competition organizers at{" "}
              <a href="mailto:uiucbadm576@gmail.com" className="underline">
                uiucbadm576@gmail.com
              </a>
            </p>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-neutral-200 text-xs text-neutral-500">
          © 2026 Gies College of Business · University of Illinois Urbana-Champaign
        </div>
      </div>
    </footer>
  );
}
