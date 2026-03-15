const stats = [
  { value: '6', label: 'data sources', sublabel: 'synthesized automatically' },
  { value: '15s', label: 'briefing time', sublabel: 'from search to conditions' },
  { value: '24/7', label: 'monitoring', sublabel: 'for saved trips' },
];

export function Stats() {
  return (
    <section className="border-y border-[#E8E3DB] bg-[#FFF8F0] py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.value} className="text-center">
              <div className="mb-1 text-5xl font-bold text-[#1a1a1a]" style={{ fontFamily: 'var(--font-geist-mono), monospace' }}>
                {stat.value}
              </div>
              <div className="text-base font-semibold text-[#1a1a1a]">{stat.label}</div>
              <div className="mt-1 text-sm text-[#6b6b5a]">{stat.sublabel}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
