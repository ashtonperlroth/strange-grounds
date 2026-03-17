"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mountain } from "lucide-react";
import { ACTIVITY_TYPES } from "@/lib/constants";
import { HeroSearchInput } from "@/components/landing/hero-search-input";
import { ActivityToggle } from "@/components/ui/activity-toggle";
import { TrustBar } from "@/components/landing/trust-bar";
import { BrowserMockup } from "@/components/landing/browser-mockup";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Footer } from "@/components/landing/footer";

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
    <main data-testid="marketing-landing" className="bg-background">
      {/* Hero Section */}
      <section className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden">
        {/* Background — watercolor image when available, warm gradient fallback */}
        {/* TODO: Add watercolor hero image to public/hero-watercolor.jpg and uncomment */}
        {/* <Image src="/hero-watercolor.jpg" alt="" fill className="object-cover" priority /> */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(180deg, #e8dfd0 0%, #d4c9b5 40%, hsl(var(--background)) 100%)",
          }}
        />

        {/* Bottom fade to page background */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />

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
            <HeroSearchInput
              data-testid="hero-search-input"
              submitTestId="hero-cta"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Describe your trip — e.g., 3-day loop from Whitney Portal..."
            />

            <ActivityToggle
              items={ACTIVITY_TYPES}
              value={activity}
              onChange={setActivity}
              testIdPrefix="hero-activity-"
            />
          </form>

          {/* Subtext */}
          <p className="text-xs text-muted-foreground">
            Free. No account required.
          </p>
        </div>
      </section>

      {/* Trust Bar */}
      <TrustBar />

      {/* Product Screenshot */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <BrowserMockup>
            {/* Screenshot placeholder */}
            <div className="flex h-80 items-center justify-center bg-muted/30 sm:h-96 lg:h-[28rem]">
              <div className="text-center">
                <Mountain className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Product screenshot renders here
                </p>
              </div>
            </div>
          </BrowserMockup>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Real-time conditions intelligence for every backcountry trip
          </p>
        </div>
      </section>

      {/* How it Works */}
      <HowItWorks />

      {/* Footer */}
      <Footer />
    </main>
  );
}
