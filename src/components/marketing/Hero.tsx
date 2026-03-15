import Link from 'next/link';

export function Hero() {
  const dataSources = ['NWS', 'Avalanche.org', 'SNOTEL', 'USGS', 'NIFC', 'Sentinel-2'];

  return (
    <section className="relative overflow-hidden bg-[#FFFBF5] py-24 md:py-32">
      {/* Subtle mountain silhouette background */}
      <div className="absolute inset-0 opacity-[0.04]" aria-hidden="true">
        <svg viewBox="0 0 1440 400" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
          <path d="M0 400 L180 160 L320 280 L480 80 L640 220 L800 40 L960 200 L1100 100 L1260 260 L1440 120 L1440 400 Z" fill="#2d5016"/>
        </svg>
      </div>

      <div className="relative mx-auto max-w-6xl px-6 text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-widest text-[#2d5016]">
          Backcountry Conditions Intelligence
        </p>

        <h1 className="mb-6 text-5xl font-semibold leading-tight tracking-tight text-[#1a1a1a] md:text-7xl" style={{ fontFamily: 'var(--font-fraunces), serif' }}>
          Every data source.<br />
          <em>One briefing.</em>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-[#4a4a3a]">
          AI-powered backcountry conditions intelligence — avalanche, weather, snowpack, stream flows, fires, and satellite imagery synthesized into one expert briefing for your trip.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/app"
            className="rounded-full bg-[#1a1a1a] px-8 py-3.5 text-base font-medium text-[#FFFBF5] transition-colors hover:bg-gray-800"
            data-testid="hero-cta"
          >
            Try it now →
          </Link>
        </div>

        {/* Trust indicators */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <span className="text-xs font-medium uppercase tracking-wider text-[#6b6b5a]">Data from</span>
          {dataSources.map((source) => (
            <span key={source} className="text-sm font-medium text-[#4a4a3a]">
              {source}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
