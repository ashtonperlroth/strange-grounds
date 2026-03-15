import Link from 'next/link';

export function CTASection() {
  return (
    <section className="bg-[#FFFBF5] py-24">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <h2 className="mb-6 text-4xl font-semibold text-[#1a1a1a] md:text-5xl" style={{ fontFamily: 'var(--font-fraunces), serif' }}>
          Plan your next trip<br />with confidence
        </h2>
        <p className="mx-auto mb-10 max-w-lg text-lg text-[#4a4a3a]">
          Free to use. No account required for your first briefing.
        </p>
        <Link
          href="/app"
          className="inline-block rounded-full bg-[#1a1a1a] px-8 py-3.5 text-base font-medium text-[#FFFBF5] transition-colors hover:bg-gray-800"
          data-testid="cta-try-it-now"
        >
          Try it now →
        </Link>
      </div>
    </section>
  );
}
