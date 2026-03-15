export interface Feature {
  label: string;
  heading: string;
  bullets: { title: string; description: string }[];
  imageAlt: string;
  reversed?: boolean;
}

function FeaturePlaceholder({ alt }: { alt: string }) {
  return (
    <div className="aspect-[4/3] w-full rounded-lg border border-[#E8E3DB] bg-[#F5F0E8] flex items-center justify-center">
      <span className="text-sm text-[#6b6b5a]">{alt}</span>
    </div>
  );
}

export function FeatureSection({ feature }: { feature: Feature }) {
  return (
    <section id="features" className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className={`grid grid-cols-1 items-center gap-16 lg:grid-cols-2 ${feature.reversed ? 'lg:[&>*:first-child]:order-2' : ''}`}>
          <div>
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-[#2d5016]">
              {feature.label}
            </p>
            <h2 className="mb-6 text-3xl font-semibold leading-tight text-[#1a1a1a] md:text-4xl" style={{ fontFamily: 'var(--font-fraunces), serif' }}>
              {feature.heading}
            </h2>
            <ul className="space-y-4">
              {feature.bullets.map((bullet) => (
                <li key={bullet.title} className="flex gap-3">
                  <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#2d5016]" />
                  <div>
                    <span className="font-semibold text-[#1a1a1a]">{bullet.title}</span>
                    <span className="text-[#4a4a3a]"> — {bullet.description}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <FeaturePlaceholder alt={feature.imageAlt} />
        </div>
      </div>
    </section>
  );
}

export const features: Feature[] = [
  {
    label: 'Intelligence',
    heading: "Know what's ahead.\nEvery segment.",
    bullets: [
      { title: 'Segment-by-segment hazard analysis', description: 'along your route' },
      { title: 'Avalanche danger, stream crossings, weather windows', description: 'all in one briefing' },
      { title: 'Cross-referenced data', description: 'from NWS, avalanche centers, SNOTEL, and USGS' },
    ],
    imageAlt: 'Route-aware briefing screenshot',
    reversed: false,
  },
  {
    label: 'Planning',
    heading: "See conditions,\nnot just data.",
    bullets: [
      { title: 'Avalanche zones, slope angle shading, fire perimeters', description: 'stream gauges on the map' },
      { title: 'Draw routes or import GPX/KML files', description: 'then generate a briefing' },
      { title: '3D terrain visualization', description: 'powered by elevation data' },
    ],
    imageAlt: 'Map with condition layers screenshot',
    reversed: true,
  },
  {
    label: 'Monitoring',
    heading: "Conditions change.\nWe'll tell you.",
    bullets: [
      { title: 'Daily condition change detection', description: 'for saved trips' },
      { title: 'Email alerts', description: 'when conditions shift significantly' },
      { title: 'Shareable briefing links', description: 'for your group' },
    ],
    imageAlt: 'Trip monitoring dashboard screenshot',
    reversed: false,
  },
];
