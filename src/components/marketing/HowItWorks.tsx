import { MapPin, Sparkles, Mountain } from 'lucide-react';
import { type LucideIcon } from 'lucide-react';

interface Step {
  icon: LucideIcon;
  heading: string;
  description: string;
}

const steps: Step[] = [
  {
    icon: MapPin,
    heading: 'Search',
    description: 'Enter your destination or draw a route on the map.',
  },
  {
    icon: Sparkles,
    heading: 'Generate',
    description: 'Our AI synthesizes 6+ data sources into one expert briefing.',
  },
  {
    icon: Mountain,
    heading: 'Go',
    description: 'Head out with confidence. Monitor conditions and get alerts.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-[#FFFBF5] py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-[#2d5016]">Process</p>
          <h2 className="text-4xl font-semibold text-[#1a1a1a] md:text-5xl" style={{ fontFamily: 'var(--font-fraunces), serif' }}>
            From search to briefing<br />in three steps
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.heading} className="rounded-lg border border-[#E8E3DB] bg-[#FFF8F0] p-8">
                <div className="mb-5 flex size-12 items-center justify-center rounded-lg bg-[#F5F0E8]">
                  <Icon className="size-6 text-[#2d5016]" />
                </div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#6b6b5a]">
                  Step {index + 1}
                </div>
                <h3 className="mb-2 text-xl font-semibold text-[#1a1a1a]">{step.heading}</h3>
                <p className="leading-relaxed text-[#4a4a3a]">{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
