"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Shield, FileDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: MapPin,
    title: "Describe",
    subtitle: "Tell us where you're going.",
    description:
      "Natural language or drop a pin. Describe your route, dates, and group size — we handle the rest.",
  },
  {
    icon: Shield,
    title: "Check",
    subtitle: "7 data sources. One briefing.",
    description:
      "Satellite imagery, weather, avalanche, snowpack, streamflow, fire conditions, and sun/moon data — synthesized automatically.",
  },
  {
    icon: FileDown,
    title: "Go",
    subtitle: "Safety briefing with condition cards.",
    description:
      "Actionable condition cards rated by severity. Download a PDF or share the link with your group.",
  },
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
};

export function FeatureShowcase() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  function goTo(index: number) {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  }

  function next() {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % FEATURES.length);
  }

  function prev() {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + FEATURES.length) % FEATURES.length);
  }

  const feature = FEATURES[currentIndex];

  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center font-serif text-3xl font-bold text-foreground sm:text-4xl">
          How it works
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-center text-muted-foreground">
          Three steps to safer backcountry travel.
        </p>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Left: visual placeholder area */}
          <div className="relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-lg border border-border bg-card">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="flex flex-col items-center gap-4 p-8 text-center"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-secondary text-accent">
                  <feature.icon size={32} />
                </div>
                <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                  Step {String(currentIndex + 1).padStart(2, "0")}
                </span>
                <h3 className="font-serif text-2xl font-bold text-foreground">
                  {feature.title}
                </h3>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right: text content with navigation */}
          <div className="flex flex-col justify-between">
            <div className="flex flex-col gap-6">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentIndex}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="flex flex-col gap-4"
                >
                  <h3 className="font-serif text-3xl font-bold text-foreground">
                    {feature.subtitle}
                  </h3>
                  <p className="text-base leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Feature list - static */}
              <ul className="mt-4 space-y-2">
                {FEATURES.map((f, i) => (
                  <motion.li
                    key={f.title}
                    initial={{ opacity: 0.7 }}
                    whileHover={{ opacity: 1, x: 4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <button
                      onClick={() => goTo(i)}
                      className={`flex items-center gap-3 text-left text-sm tracking-tight transition-colors ${
                        i === currentIndex
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                          i === currentIndex
                            ? "bg-foreground text-primary-foreground"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {i + 1}
                      </span>
                      {f.title} — {f.subtitle}
                    </button>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Navigation arrows */}
            <div className="mt-8 flex items-center gap-3">
              <button
                onClick={prev}
                aria-label="Previous feature"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={next}
                aria-label="Next feature"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <ChevronRight size={18} />
              </button>
              <span className="ml-2 font-mono text-xs text-muted-foreground">
                {String(currentIndex + 1).padStart(2, "0")} / {String(FEATURES.length).padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
