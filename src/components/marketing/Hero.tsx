'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const HEROES = [
  { src: '/hero-1.webp', alt: 'Denali from the tundra, Alaska' },
  { src: '/hero-2.webp', alt: 'Grand Tetons from the valley, Wyoming' },
  { src: '/hero-3.webp', alt: 'Mount Rainier above wildflower meadows' },
  { src: '/hero-4.webp', alt: 'Maroon Bells in autumn, Colorado' },
  { src: '/hero-5.webp', alt: 'Sierra Nevada granite high country' },
  { src: '/hero-6.webp', alt: 'Glacier National Park valleys, Montana' },
  { src: '/hero-7.webp', alt: 'Patagonia steppe, Argentina' },
];

export function Hero() {
  const [hero, setHero] = useState<{ src: string; alt: string } | null>(
    () => HEROES[Math.floor(Math.random() * HEROES.length)]
  );
  const dataSources = ['NWS', 'Avalanche.org', 'SNOTEL', 'USGS', 'NIFC', 'Sentinel-2'];

  return (
    <section className="relative overflow-hidden bg-[#FFFBF5] flex min-h-[560px] md:min-h-[640px] flex-col items-center justify-end pb-16 md:pb-24">
      {/* Hero image — full bleed, anchored to show peaks */}
      {hero && (
        <Image
          src={hero.src}
          alt={hero.alt}
          fill
          priority
          className="object-cover object-[center_15%]"
          onError={() => setHero(null)}
          sizes="100vw"
        />
      )}

      {/* Gradient overlay — transparent at top, cream at bottom for text readability */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to top, #FFFBF5 0%, rgba(255,251,245,0.75) 35%, rgba(255,251,245,0) 70%)',
        }}
        aria-hidden="true"
      />

      {/* Fallback background when no image */}
      {!hero && (
        <div className="absolute inset-0 opacity-[0.04]" aria-hidden="true">
          <svg viewBox="0 0 1440 400" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
            <path d="M0 400 L180 160 L320 280 L480 80 L640 220 L800 40 L960 200 L1100 100 L1260 260 L1440 120 L1440 400 Z" fill="#2d5016"/>
          </svg>
        </div>
      )}

      {/* Text content — relative so it sits above the overlays */}
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
