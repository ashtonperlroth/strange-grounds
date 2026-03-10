import Link from "next/link";
import { Mountain } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] text-stone-800">
      <header className="border-b border-stone-200 bg-white px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium text-stone-600 transition-colors hover:text-stone-800"
        >
          <Mountain className="h-5 w-5 text-emerald-600" />
          Strange Grounds
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-stone-900">Terms of Service</h1>
        <p className="mt-1 text-sm text-stone-500">Last updated: March 2025</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="font-semibold text-stone-800">
              Informational use only
            </h2>
            <p className="mt-1 text-stone-600">
              Briefings and conditions data provided by Strange Grounds are for
              informational purposes only. They are not a substitute for
              personal judgment, professional guidance, or official avalanche,
              weather, or land management advisories.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-stone-800">No liability</h2>
            <p className="mt-1 text-stone-600">
              We are not liable for any decisions, injuries, or outcomes
              resulting from use of this service. Backcountry travel involves
              inherent risk. You assume full responsibility for your safety and
              the choices you make based on conditions data.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-stone-800">
              Use at your own risk
            </h2>
            <p className="mt-1 text-stone-600">
              This is a safety-critical tool. Always verify conditions through
              official sources (e.g., avalanche centers, NWS) before making
              travel decisions. Data may be delayed, incomplete, or inaccurate.
            </p>
          </section>
        </div>

        <p className="mt-10 text-sm text-stone-500">
          <Link href="/" className="underline hover:text-stone-700">
            ← Back to app
          </Link>
          {" · "}
          <Link href="/privacy" className="underline hover:text-stone-700">
            Privacy Policy
          </Link>
        </p>
      </main>
    </div>
  );
}
