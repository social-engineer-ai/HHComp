import Link from "next/link";
import { PublicHeader, PublicFooter } from "@/components/PublicHeader";
import { Timeline } from "@/components/Timeline";

export default function LandingPage() {
  return (
    <>
      <PublicHeader />

      {/* Registration open notice */}
      <div className="bg-green-600 text-white border-b border-green-700">
        <div className="max-w-6xl mx-auto px-6 py-3 text-sm md:text-base font-semibold text-center">
          You may now register your team and sign the NDA. We will send a notification email when the data is ready to download.
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-800 to-red-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28 relative grid md:grid-cols-5 gap-10 items-center">
          <div className="md:col-span-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-red-300">
              April 17 to May 7, 2026
            </p>
            <h1 className="mt-4 text-4xl md:text-6xl font-bold tracking-tight leading-tight">
              Supply Chain Analytics Competition{" "}
              <span className="text-red-400">2026</span>
            </h1>
            <p className="mt-4 text-lg md:text-xl text-neutral-200 max-w-2xl">
              Presented by Horizon Hobby & the Gies College of Business. Build
              a predictive model, present to industry judges, and win cash prizes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="rounded-md bg-red-600 hover:bg-red-700 px-6 py-3 font-semibold text-white shadow-lg"
              >
                Register your team
              </Link>
              <Link
                href="#about"
                className="rounded-md border border-white/30 px-6 py-3 font-semibold text-white hover:bg-white/10"
              >
                Learn more
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-8 text-sm">
              <div>
                <div className="text-2xl font-bold text-red-400">$1,500+</div>
                <div className="text-neutral-300">In prizes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400">2 weeks</div>
                <div className="text-neutral-300">Competition window</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400">2-person</div>
                <div className="text-neutral-300">Teams</div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 relative">
            <div
              className="absolute inset-0 -m-8 blur-3xl pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at center, rgba(239,68,68,0.35), transparent 70%)",
              }}
              aria-hidden
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/img/losi-22s-sprint.jpg"
              alt="LOSI 22S Sprint Car, the product line at the heart of this year's competition"
              className="relative w-full h-auto drop-shadow-2xl"
              fetchPriority="high"
            />
            <p className="text-xs text-neutral-400 text-center mt-3">
              LOSI 22S Sprint 2WD, the product line at the heart of this year's forecasting challenge
            </p>
          </div>
        </div>
      </section>

      {/* About Horizon */}
      <section id="about" className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-red-700">
            Our Partner
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">
            Horizon Hobby: 40 years of RC innovation
          </h2>
          <p className="mt-4 text-neutral-700 leading-relaxed">
            Headquartered right here in Champaign, Horizon Hobby is the world's
            largest manufacturer and distributor of radio-controlled cars, planes,
            boats, and helicopters. For four decades they've been bringing
            hobbyists the most innovative products in the industry.
          </p>
          <p className="mt-4 text-neutral-700 leading-relaxed">
            They're also partnering with Gies on a real-world operations
            challenge worth <strong>$7M+ annually</strong>.
          </p>
        </div>
        <div className="rounded-lg border border-neutral-200 p-6 bg-neutral-50">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            The challenge
          </p>
          <h3 className="mt-2 text-xl font-semibold">Forecasting attach rates</h3>
          <p className="mt-3 text-neutral-700 text-sm leading-relaxed">
            Horizon sells world-class RC products. When customers need a
            replacement part, Horizon wants it to be available, but predicting{" "}
            <em>which</em> parts will be needed and <em>when</em> is hard.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-2xl font-bold text-red-700">$5.2M</div>
              <div className="text-neutral-600">Excess parts inventory</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-700">$2M</div>
              <div className="text-neutral-600">Unfillable demand / year</div>
            </div>
          </div>
          <p className="mt-4 text-neutral-700 text-sm leading-relaxed">
            Your job: build a predictive model on the LOSI 22S Sprint Car data,
            then apply it to the new 22S Dirt Oval launch.
          </p>
        </div>
      </section>

      {/* Structure */}
      <section className="bg-neutral-50 border-y border-neutral-200">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-3xl font-bold tracking-tight">Competition structure</h2>
          <div className="mt-10 grid md:grid-cols-4 gap-6">
            {[
              { n: "01", t: "Register", d: "Form a team of two currently enrolled Gies students." },
              { n: "02", t: "Receive data", d: "Sign the NDA, download the sprint car dataset and prediction template." },
              { n: "03", t: "Build & submit", d: "Build your model, submit predictions, code, methodology, and slides by May 1." },
              { n: "04", t: "Present", d: "Top three teams present to Horizon Hobby on May 7." },
            ].map((s) => (
              <div key={s.n} className="rounded-lg border border-neutral-200 bg-white p-6">
                <div className="text-3xl font-bold text-red-700">{s.n}</div>
                <div className="mt-3 font-semibold">{s.t}</div>
                <p className="mt-1 text-sm text-neutral-600">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 rounded-lg border border-neutral-200 bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-red-700">Prizes</p>
            <div className="mt-3 space-y-3">
              <div className="flex items-baseline gap-3">
                <span className="text-sm font-semibold text-neutral-500 w-20">1st place</span>
                <span className="text-xl font-bold">$500 + LOSI 22S Sprint Car</span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-sm font-semibold text-neutral-500 w-20">2nd place</span>
                <span className="text-xl font-bold">$350</span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-sm font-semibold text-neutral-500 w-20">3rd place</span>
                <span className="text-xl font-bold">$250</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section id="timeline" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold tracking-tight">Timeline</h2>
        <p className="mt-2 text-neutral-600">Key milestones from announcement to final presentations.</p>
        <div className="mt-10 max-w-2xl">
          <Timeline />
        </div>
      </section>

      {/* Eligibility + CTA */}
      <section className="border-t border-neutral-200 bg-gradient-to-br from-red-700 to-red-900 text-white">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Ready to compete?</h2>
          <p className="mt-3 text-red-100">
            You must be a currently enrolled Gies College of Business student.
            Teams of exactly two. Registration closes May 1.
          </p>
          <Link
            href="/register"
            className="mt-8 inline-block rounded-md bg-white text-red-800 px-8 py-3 font-semibold hover:bg-red-50"
          >
            Register your team
          </Link>
        </div>
      </section>

      <PublicFooter />
    </>
  );
}
