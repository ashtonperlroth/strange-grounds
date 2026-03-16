"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, ArrowRight } from "lucide-react";
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
    </main>
  );
}
