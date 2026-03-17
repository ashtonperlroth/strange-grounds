import { MapPin, Shield, FileDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Step {
  step: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    step: "01",
    icon: MapPin,
    title: "Describe",
    description:
      "Tell us where you're going and when. Describe your trip in natural language or drop a pin on the map.",
  },
  {
    step: "02",
    icon: Shield,
    title: "Check",
    description:
      "We check 7 data sources including satellite imagery, weather, avalanche, snowpack, streamflow, and fire conditions.",
  },
  {
    step: "03",
    icon: FileDown,
    title: "Go",
    description:
      "Get a safety briefing with actionable condition cards. Download a PDF or share with your group.",
  },
];

/**
 * Three-column "How it Works" step cards.
 * Sourced from 21st.dev "Features with Section" pattern,
 * adapted to Strange Grounds design system with step numbering.
 */
export function HowItWorks() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center font-serif text-3xl font-bold text-foreground sm:text-4xl">
          How it works
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-center text-muted-foreground">
          Three steps to safer backcountry travel.
        </p>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {STEPS.map((item) => (
            <div
              key={item.step}
              className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-accent">
                  <item.icon size={20} />
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  Step {item.step}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
