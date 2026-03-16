"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  ArrowRight,
  Mountain,
  Shield,
  FileDown,
} from "lucide-react";
import Link from "next/link";
import { ACTIVITY_TYPES } from "@/lib/constants";

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activity, setActivity] = useState<string>(ACTIVITY_TYPES[0]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    params.set("activity", activity);
    router.push(`/app?${params.toString()}`);
  }

  return (
    <main data-testid="marketing-landing" className="bg-[#FFFBF5]">
      {/* Hero Section */}
      <section className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden">
        {/* Background — watercolor image when available, warm gradient fallback */}
        {/* TODO: Add watercolor hero image to public/hero-watercolor.jpg and uncomment */}
        {/* <Image src="/hero-watercolor.jpg" alt="" fill className="object-cover" priority /> */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(180deg, #e8dfd0 0%, #d4c9b5 40%, #FFFBF5 100%)",
          }}
        />

        {/* Bottom fade to page background */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#FFFBF5] to-transparent" />

        <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center">
          {/* Headline */}
          <h1 className="font-serif text-5xl font-bold leading-tight text-foreground sm:text-6xl md:text-7xl">
            See your route before you go.
          </h1>

          {/* Subheadline */}
          <p className="max-w-xl text-lg text-muted-foreground">
            Satellite imagery, weather, avalanche, snowpack, water, and fire
            data — synthesized into safety cards for every backcountry trip.
          </p>

          {/* Search input + activity tabs */}
          <form
            onSubmit={handleSubmit}
            className="flex w-full max-w-lg flex-col gap-3"
          >
            <div className="relative">
              <MapPin
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                data-testid="hero-search-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Describe your trip — e.g., 3-day loop from Whitney Portal..."
                className="h-12 w-full rounded-lg border border-border bg-white pl-11 pr-14 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
              <button
                type="submit"
                data-testid="hero-cta"
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-primary-foreground transition-colors hover:bg-foreground/90"
              >
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Activity tabs */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {ACTIVITY_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  data-testid={`hero-activity-${type.toLowerCase().replace(/\s+/g, "-")}`}
                  onClick={() => setActivity(type)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    activity === type
                      ? "bg-accent text-white"
                      : "bg-white/80 text-muted-foreground hover:bg-white"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </form>

          {/* Subtext */}
          <p className="text-xs text-muted-foreground">
            Free. No account required.
          </p>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="py-12">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-6">
          {[
            "NWS",
            "USGS",
            "SNOTEL",
            "avalanche.org",
            "NIFC",
            "Sentinel-2",
            "SunCalc",
          ].map((source, i) => (
            <span key={source} className="flex items-center gap-8">
              <span className="font-mono text-sm tracking-wide text-muted-foreground">
                {source}
              </span>
              {i < 6 && (
                <span className="text-muted-foreground/30">·</span>
              )}
            </span>
          ))}
        </div>
      </section>

      {/* Product Screenshot */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-lg">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 border-b border-border bg-secondary px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-border" />
                <div className="h-3 w-3 rounded-full bg-border" />
                <div className="h-3 w-3 rounded-full bg-border" />
              </div>
              <div className="ml-4 flex-1 rounded-md bg-muted px-3 py-1">
                <span className="font-mono text-xs text-muted-foreground">
                  strangegrounds.com/app
                </span>
              </div>
            </div>
            {/* Screenshot placeholder */}
            <div className="flex h-80 items-center justify-center bg-muted/30 sm:h-96 lg:h-[28rem]">
              <div className="text-center">
                <Mountain className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Product screenshot renders here
                </p>
              </div>
            </div>
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Real-time conditions intelligence for every backcountry trip
          </p>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-serif text-3xl font-bold text-foreground sm:text-4xl">
            How it works
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-center text-muted-foreground">
            Three steps to safer backcountry travel.
          </p>

          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
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
            ].map((item) => (
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

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <Mountain size={18} className="text-accent" />
            <span className="text-sm font-semibold text-foreground">
              Strange Grounds
            </span>
          </div>

          <nav className="flex flex-wrap items-center gap-6">
            {[
              { label: "About", href: "#" },
              { label: "Data Sources", href: "/app/sources" },
              { label: "Privacy", href: "#" },
              { label: "Terms", href: "#" },
            ].map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <p className="text-xs text-muted-foreground">
            &copy; 2026 Strange Grounds
          </p>
        </div>
      </footer>
    </main>
  );
}
